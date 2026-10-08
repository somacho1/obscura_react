import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getBrands } from '../../../api/brandApi';
import { getActiveProducts, getProduct, getProductPage } from '../../../api/productApi';
import { getWishlistsByMember } from '../../../api/wishlistApi';
import { getOrdersByMember } from '../../../api/orderApi';
import { getProductOption } from '../../../api/productOptionApi';
import type { BrandResponse } from '../../../ts/brand';
import type { ProductResponse } from '../../../ts/product';
import { getImageUrl } from '../../../ts/imageUrl';
import './ForYou.css';

type RecommendationMode = 'DEFAULT' | 'PERSONAL' | 'FALLBACK';

interface RecommendationData {
  ownerNo: number | null;
  brands: BrandResponse[];
  products: ProductResponse[];
  mode: RecommendationMode;
}

// 브랜드·카테고리별 취향 점수를 누적합니다.
function addScore(scores: Map<number, number>, no: number, weight: number) {
  scores.set(no, (scores.get(no) ?? 0) + weight);
}

// 일부 이력 조회가 실패하면 개인화 대신 기본 추천으로 전환합니다.
function fulfilledValues<T>(results: PromiseSettledResult<T>[]): T[] {
  const values: T[] = [];
  for (const result of results) {
    if (result.status === 'rejected') throw result.reason;
    values.push(result.value);
  }
  return values;
}

export default function ForYou() {
  const { member } = useAuth();
  const memberNo = member?.no ?? null;

  const [data, setData] = useState<RecommendationData | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadRecommendations = async () => {
      setData(null);
      setError('');

      try {
        // 비회원과 이력이 없는 회원에게도 기본 추천을 표시합니다.
        const [brandData, productData] = await Promise.all([
          getBrands(),
          getActiveProducts(),
        ]);
        if (cancelled) return;

        const activeBrands = brandData.filter((brand) => brand.statusNo === 1);
        const activeBrandNos = new Set(activeBrands.map((brand) => brand.no));

        // 판매 중이며 활성 브랜드에 속한 모든 상품을 추천 후보로 사용합니다.
        // 왼쪽 추천 브랜드 8개에 속하는지 여부로 제한하지 않습니다.
        const candidates = productData.filter(
          (product) => product.statusNo === 1 && activeBrandNos.has(product.bno),
        );

        // 기본 상품 추천: 인기순을 우선하고 나머지는 최신순으로 정렬합니다.
        let popularity: ProductResponse[] = [];
        try {
          const page = await getProductPage({
            sort: 'POPULAR',
            page: 1,
            size: 24,
          });
          popularity = page.content;
        } catch (error) {
          console.warn('기본 추천 인기순 조회 실패, 최신순 사용:', error);
        }
        if (cancelled) return;

        const popularityRank = new Map(
          popularity.map((product, index) => [product.no, index]),
        );

        const defaultProducts = [...candidates].sort((a, b) => {
          const rankA = popularityRank.get(a.no) ?? Number.MAX_SAFE_INTEGER;
          const rankB = popularityRank.get(b.no) ?? Number.MAX_SAFE_INTEGER;
          return rankA - rankB || b.no - a.no;
        });

        // 왼쪽 브랜드 추천: 상품이 있는 활성 브랜드 중 최대 8개를 표시합니다.
        // Top Brands 노출 설정과 관리자가 지정한 순서를 우선합니다.
        const availableBrandNos = new Set(candidates.map((product) => product.bno));
        const defaultBrands = activeBrands
          .filter((brand) => availableBrandNos.has(brand.no))
          .sort((a, b) => {
            const priorityA = a.topBrandYn === 'Y' ? 0 : 1;
            const priorityB = b.topBrandYn === 'Y' ? 0 : 1;
            return priorityA - priorityB
              || (a.topSeqNo ?? 0) - (b.topSeqNo ?? 0)
              || a.no - b.no;
          })
          .slice(0, 8);

        let rankedBrands = defaultBrands;
        let rankedProducts = defaultProducts;
        let mode: RecommendationMode = 'DEFAULT';

        // 로그인 회원은 구매·찜 이력으로 상품과 브랜드를 각각 추천합니다.
        if (memberNo !== null) {
          try {
            const historyResults = await Promise.allSettled([
              getWishlistsByMember(memberNo),
              getOrdersByMember(memberNo),
            ]);
            const wishResult = historyResults[0];
            const orderResult = historyResults[1];

            if (wishResult.status === 'rejected') throw wishResult.reason;
            if (orderResult.status === 'rejected') throw orderResult.reason;
            if (cancelled) return;

            const wishlists = wishResult.value;
            const orders = orderResult.value;

            // 결제 완료 이후 주문을 반영하고 전체 취소 주문은 제외합니다.
            const purchasedItems = orders
              .filter((order) =>
                [2, 3, 4, 5].includes(order.statusNo)
                && order.cancelStatusNo !== 2
                && order.cancelStatusNo !== 3,
              )
              .flatMap((order) => order.items)
              .filter((item) => item.qty - (item.cancelQty ?? 0) > 0);

            // 주문 옵션번호에서 실제 상품번호를 조회합니다.
            const optionNos = [...new Set(purchasedItems.map((item) => item.pono))];
            const optionResults = await Promise.allSettled(
              optionNos.map((no) => getProductOption(no)),
            );
            const options = fulfilledValues(optionResults);
            if (cancelled) return;

            const purchasedNos = new Set(options.map((option) => option.pno));
            const wishedNos = new Set(wishlists.map((wishlist) => wishlist.pno));
            const historyNos = [...new Set([...wishedNos, ...purchasedNos])];

            // 현재 판매중지된 과거 상품도 취향 분석에는 사용합니다.
            const productMap = new Map(
              productData.map((product) => [product.no, product]),
            );
            const missingNos = historyNos.filter((no) => !productMap.has(no));
            const historyProductResults = await Promise.allSettled(
              missingNos.map((no) => getProduct(no)),
            );
            fulfilledValues(historyProductResults).forEach(
              (product) => productMap.set(product.no, product),
            );
            if (cancelled) return;

            const brandScores = new Map<number, number>();
            const categoryScores = new Map<number, number>();

            // 구매 3점, 찜 2점이며 같은 상품은 두 점수를 합산합니다.
            for (const no of historyNos) {
              const product = productMap.get(no);
              if (!product) continue;

              const weight = (purchasedNos.has(no) ? 3 : 0)
                + (wishedNos.has(no) ? 2 : 0);
              addScore(brandScores, product.bno, weight);
              addScore(categoryScores, product.cno, weight);
            }

            if (brandScores.size > 0) {
              // 상품 추천에는 브랜드 선호도와 카테고리 선호도를 반영합니다.
              const scoreProduct = (product: ProductResponse) =>
                (brandScores.get(product.bno) ?? 0) * 2
                + (categoryScores.get(product.cno) ?? 0);

              // 이미 구매한 상품은 제외합니다.
              // 왼쪽에 표시하는 브랜드와 관계없이 전체 후보에서 추천합니다.
              rankedProducts = defaultProducts
                .filter((product) => !purchasedNos.has(product.no))
                .sort((a, b) => {
                  const scoreDifference = scoreProduct(b) - scoreProduct(a);
                  const rankA = popularityRank.get(a.no) ?? Number.MAX_SAFE_INTEGER;
                  const rankB = popularityRank.get(b.no) ?? Number.MAX_SAFE_INTEGER;
                  return scoreDifference || rankA - rankB || b.no - a.no;
                });

              // 브랜드 추천은 구매·찜에서 계산한 브랜드 선호도로 정렬합니다.
              // 오른쪽에 실제 표시되는 상품 목록을 기준으로 제한하지 않습니다.
              rankedBrands = [...defaultBrands];

              rankedBrands = activeBrands
                .filter((brand) => availableBrandNos.has(brand.no))
                .sort((a, b) => {
                  const scoreDifference = (brandScores.get(b.no) ?? 0)
                    - (brandScores.get(a.no) ?? 0);
                  const priorityA = a.topBrandYn === 'Y' ? 0 : 1;
                  const priorityB = b.topBrandYn === 'Y' ? 0 : 1;
                  return scoreDifference
                    || priorityA - priorityB
                    || (a.topSeqNo ?? 0) - (b.topSeqNo ?? 0)
                    || a.no - b.no;
                })
                .slice(0, 8);

              mode = 'PERSONAL';
            }
          } catch (error) {
            // 이력 조회 실패 시 기본 브랜드·상품 추천으로 전환합니다.
            console.warn('개인화 추천 조회 실패, 기본 추천 사용:', error);
            mode = 'FALLBACK';
            rankedBrands = defaultBrands;
            rankedProducts = defaultProducts;
          }
        }
        if (cancelled) return;

        // 브랜드 목록과 상품 목록을 각각 저장합니다.
        // 추천 브랜드 번호로 상품을 필터링하지 않습니다.
        setData({
          ownerNo: memberNo,
          brands: rankedBrands,
          products: rankedProducts,
          mode,
        });
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error ? error.message : '추천 상품 조회에 실패했습니다.',
          );
        }
      }
    };

    void loadRecommendations();

    // 회원 변경·새로고침 시 이전 요청 결과가 표시되는 것을 방지합니다.
    return () => { cancelled = true; };
  }, [memberNo, reloadKey]);

  // 회원 전환 순간 이전 회원의 추천이 보이지 않도록 합니다.
  const currentData = data?.ownerNo === memberNo ? data : null;

  // 전체 추천 상품 중 최대 7개를 표시합니다. 브랜드 선택 필터는 없습니다.
  const visibleProducts = currentData?.products.slice(0, 7) ?? [];

  const description = memberNo === null
    ? 'Discover your next favorite.'
    : currentData?.mode === 'PERSONAL'
      ? 'Inspired by your taste.'
      : currentData?.mode === 'FALLBACK'
        ? 'Discover your next favorite.'
        : 'Save your favorites. Discover more you.';

  return (
    <section className="for-you" aria-label="추천 상품과 브랜드">
      <div className="for-you-layout">
        {/* 왼쪽: 제목과 브랜드관으로 이동하는 추천 브랜드 링크 */}
        <aside className="for-you-left">
          <div className="for-you-title">
            <h2>{memberNo === null ? 'Discover' : 'For You'}</h2>
            <p>{description}</p>
          </div>

          {currentData && currentData.brands.length > 0 && (
            <nav className="for-you-brand-list" aria-label="추천 브랜드">
              {currentData.brands.map((brand) => (
                <Link
                  key={brand.no}
                  to={`/brands/${brand.no}`}
                  className="for-you-brand-link"
                  aria-label={`${brand.name} 브랜드관 보기`}
                >
                  {brand.name}
                </Link>
              ))}
            </nav>
          )}

          {memberNo !== null && currentData && (
            <button
              type="button"
              className="for-you-refresh"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Refresh Picks
            </button>
          )}
        </aside>

        {/* 오른쪽: 추천 상품 이미지 클릭 시 해당 상품 상세페이지로 이동 */}
        <div className="for-you-content">
          {error ? (
            <div className="for-you-message" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
                다시 시도
              </button>
            </div>
          ) : !currentData ? (
            <p className="for-you-message" role="status">
              추천 상품을 불러오는 중입니다.
            </p>
          ) : visibleProducts.length === 0 ? (
            <p className="for-you-message">추천할 판매 중인 상품이 없습니다.</p>
          ) : (
            <div className="for-you-products">
              {visibleProducts.map((product, index) => (
                <div
                  key={product.no}
                  className={`for-you-product ${index === 0 ? 'for-you-product--featured' : ''}`}
                >
                  <Link
                    to={`/products/${product.no}`}
                    className="for-you-image-card"
                    aria-label={`${product.name} 상품 보기`}
                  >
                    {product.mainImageUrl ? (
                      <img
                        src={getImageUrl(product.mainImageUrl)}
                        alt={product.name}
                        loading="lazy"
                      />
                    ) : (
                      <span className="for-you-no-image">NO IMAGE</span>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}