import { useEffect, useRef, useState } from 'react';
import { Scrollbar } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper';
import { getTopBrands } from '../../../api/brandApi';
import { getProductsByBrand } from '../../../api/productApi';
import type { BrandResponse } from '../../../ts/brand';
import type { Product, ProductResponse } from '../../../ts/product';
import { getImageUrl } from '../../../ts/imageUrl';
import ProductCard from '../../product/ProductCard';
import 'swiper/css';
import 'swiper/css/scrollbar';
import './TopBrands.css';

// 서버 상품 데이터를 공통 상품 카드 형식으로 변환합니다.
function toCardProduct(product: ProductResponse): Product {
  const categoryName = (product.categoryName ?? '').toUpperCase();
  const category: Product['category'] =
    categoryName === 'WOMEN' ? 'WOMEN'
      : categoryName === 'SHOES' ? 'SHOES'
        : categoryName === 'ACC' ? 'ACC'
          : 'MEN';

  return {
    id: product.no,
    brand: product.brandName,
    name: product.name,
    price: product.salePrice,
    image: product.mainImageUrl ?? '',
    category,
    discountRate: product.discountRate > 0 ? product.discountRate : undefined,
    originalPrice: product.discountRate > 0 ? product.price : undefined,
  };
}

export default function TopBrands() {
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [selectedNo, setSelectedNo] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState('');
  const [productsError, setProductsError] = useState('');

  // 로고 슬라이더만 화살표로 제어합니다.
  const brandSwiper = useRef<SwiperInstance | null>(null);
  const [brandNavigation, setBrandNavigation] = useState({
    locked: true,
    beginning: true,
    end: true,
  });

  // 이동 위치와 화면 크기에 맞춰 화살표 활성 상태를 갱신합니다.
  const syncBrandNavigation = (swiper: SwiperInstance) => {
    setBrandNavigation({
      locked: swiper.isLocked,
      beginning: swiper.isBeginning,
      end: swiper.isEnd,
    });
  };

  // 관리자에서 노출 설정한 브랜드를 서버 정렬 순서대로 조회합니다.
  useEffect(() => {
    const controller = new AbortController();

    const loadBrands = async () => {
      setBrandsLoading(true);
      setBrandsError('');

      try {
        const data = await getTopBrands(controller.signal);
        if (controller.signal.aborted) return;

        setBrands(data);
        setSelectedNo(data[0]?.no ?? null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setBrandsError(error instanceof Error ? error.message : '브랜드 조회에 실패했습니다.');
      } finally {
        if (!controller.signal.aborted) setBrandsLoading(false);
      }
    };

    void loadBrands();
    return () => controller.abort();
  }, []);

  // 선택한 브랜드의 판매 중인 상품을 최신순으로 조회합니다.
  useEffect(() => {
    if (selectedNo === null) return;
    let cancelled = false;

    const loadProducts = async () => {
      setProductsLoading(true);
      setProductsError('');
      setProducts([]);

      try {
        const data = await getProductsByBrand(selectedNo);
        if (cancelled) return;

        // 3개로 잘라내지 않고 상품 슬라이더에서 넘겨볼 수 있게 합니다.
        const visible = data
          .filter((product) => product.statusNo === 1)
          .sort((a, b) => b.no - a.no)
          .map(toCardProduct);

        setProducts(visible);
      } catch (error) {
        if (cancelled) return;
        setProductsError(error instanceof Error ? error.message : '상품 조회에 실패했습니다.');
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };

    void loadProducts();

    // 이전 브랜드의 응답이 새 브랜드 상품을 덮어쓰지 않도록 합니다.
    return () => { cancelled = true; };
  }, [selectedNo]);

  const selectedBrand = brands.find((brand) => brand.no === selectedNo);

  const handleSelectBrand = (brandNo: number) => {
    if (brandNo === selectedNo) return;

    setProducts([]);
    setProductsError('');
    setProductsLoading(true);
    setSelectedNo(brandNo);
  };

  // 노출 브랜드가 없으면 메인 영역을 숨깁니다.
  if (!brandsLoading && !brandsError && brands.length === 0) return null;

  return (
    <section className="top-brands">
      <div className="top-brands-inner">
        <div className="top-brands-heading">
          <h2>Top Brands</h2>
        </div>

        {brandsLoading && (
          <p className="top-brands-message" role="status">브랜드를 불러오는 중입니다.</p>
        )}
        {brandsError && (
          <p className="top-brands-message" role="alert">{brandsError}</p>
        )}

        {!brandsLoading && !brandsError && selectedBrand && (
          <>
            {/* 브랜드 로고: 화살표 또는 드래그로 이동합니다. */}
            <div className="brand-slider-wrap">
              <button
                type="button"
                className="brand-prev"
                aria-label="이전 브랜드 목록"
                disabled={brandNavigation.locked || brandNavigation.beginning}
                onClick={() => brandSwiper.current?.slidePrev()}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M15 5L8 12L15 19"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <Swiper
                className="top-brand-logo-swiper"
                slidesPerView={Math.min(brands.length, 3)}
                slidesPerGroup={1}
                spaceBetween={18}
                watchOverflow
                grabCursor
                onSwiper={(swiper) => {
                  brandSwiper.current = swiper;
                  syncBrandNavigation(swiper);
                }}
                onSlideChange={syncBrandNavigation}
                onResize={syncBrandNavigation}
                onBreakpoint={syncBrandNavigation}
                onLock={syncBrandNavigation}
                onUnlock={syncBrandNavigation}
                breakpoints={{
                  769: {
                    slidesPerView: Math.min(brands.length, 4),
                    spaceBetween: 24,
                  },
                  1025: {
                    slidesPerView: Math.min(brands.length, 5),
                    spaceBetween: 30,
                  },
                }}
              >
                {brands.map((brand) => (
                  <SwiperSlide key={brand.no}>
                    <button
                      type="button"
                      className={`top-brand-tab ${selectedNo === brand.no ? 'active' : ''}`}
                      aria-label={`${brand.name} 브랜드 보기`}
                      aria-pressed={selectedNo === brand.no}
                      onClick={() => handleSelectBrand(brand.no)}
                    >
                      {brand.logoUrl ? (
                        <img src={getImageUrl(brand.logoUrl)} alt={brand.name} />
                      ) : (
                        <span>{brand.name}</span>
                      )}
                    </button>
                  </SwiperSlide>
                ))}
              </Swiper>

              <button
                type="button"
                className="brand-next"
                aria-label="다음 브랜드 목록"
                disabled={brandNavigation.locked || brandNavigation.end}
                onClick={() => brandSwiper.current?.slideNext()}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 5L16 12L9 19"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="top-brand-showcase">
              {/* PC·태블릿에서는 왼쪽, 모바일에서는 위쪽에 표시합니다. */}
              <div className="top-brand-visual">
                {selectedBrand.visualUrl ? (
                  <img
                    src={getImageUrl(selectedBrand.visualUrl)}
                    alt={`${selectedBrand.name} 브랜드 대표 이미지`}
                    loading="lazy"
                  />
                ) : (
                  <div className="top-brand-visual-placeholder">
                    {selectedBrand.name}
                  </div>
                )}
              </div>

              <div className="top-brand-content">
                {productsLoading && (
                  <p className="top-brands-message" role="status">상품을 불러오는 중입니다.</p>
                )}
                {productsError && (
                  <p className="top-brands-message" role="alert">{productsError}</p>
                )}
                {!productsLoading && !productsError && products.length === 0 && (
                  <p className="top-brands-message">판매 중인 상품이 없습니다.</p>
                )}

                {!productsLoading && !productsError && products.length > 0 && (
                  <Swiper
                    key={selectedNo}
                    className="top-brand-product-swiper"
                    modules={[Scrollbar]}
                    slidesPerView={2}
                    slidesPerGroup={1}
                    spaceBetween={12}
                    scrollbar={{ draggable: true, hide: false }}
                    watchOverflow
                    grabCursor
                    breakpoints={{
                      769: {
                        slidesPerView: 2,
                        spaceBetween: 16,
                      },
                      1025: {
                        slidesPerView: 3,
                        spaceBetween: 18,
                      },
                    }}
                  >
                    {products.map((product) => (
                      <SwiperSlide key={product.id}>
                        <ProductCard product={product} />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}