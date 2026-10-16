import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getForYouRecommendations } from '../../../api/recommendationApi';
import type { RecommendationResponse } from '../../../api/recommendationApi';
import { getImageUrl } from '../../../ts/imageUrl';
import './ForYou.css';

export default function ForYou() {
  const { member, authLoading } = useAuth();
  const memberNo = member?.no ?? null;
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    let active = true;
    setData(null);
    setError('');
    getForYouRecommendations(controller.signal).then(result => {
      if (!active) return;
      // 다른 탭에서 로그인 계정이 변경된 경우 현재 인증부터 다시 확인합니다.
      if (result.ownerNo !== memberNo) {
        window.dispatchEvent(new Event('obscura-auth-refresh'));
        return;
      }
      setData(result);
    }).catch(err => {
      if (active && !controller.signal.aborted)
        setError(err instanceof Error ? err.message : '추천 상품을 불러오지 못했습니다.');
    });
    return () => { active = false; controller.abort(); };
  }, [memberNo, authLoading, reloadKey]);

  // 로그인/로그아웃 전환 순간 이전 회원의 추천을 표시하지 않습니다.
  const currentData = data?.ownerNo === memberNo ? data : null;
  const visibleProducts = currentData?.products.slice(0, 7) ?? [];
  const description = memberNo === null
    ? 'Discover your next favorite.'
    : currentData?.mode === 'AI_TAGS'
      ? 'Styles inspired by your favorites.'
      : currentData?.mode === 'HISTORY'
        ? 'Inspired by your taste.'
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
