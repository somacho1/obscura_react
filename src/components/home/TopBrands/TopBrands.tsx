import { useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper';
import { getTopBrands } from '../../../api/brandApi';
import { getProductsByBrand } from '../../../api/productApi';
import type { BrandResponse } from '../../../ts/brand';
import type { Product, ProductResponse } from '../../../ts/product';
import { getImageUrl } from '../../../ts/imageUrl';
import ProductCard from '../../product/ProductCard';
import 'swiper/css';
import './TopBrands.css';

// 공통 ProductCard에 맞춰 서버 상품 데이터를 변환합니다.
function toCardProduct(product: ProductResponse): Product {
  const categoryName = product.categoryName.toUpperCase();
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
  const brandSwiper = useRef<SwiperInstance | null>(null);

  // 서버가 정렬한 노출 브랜드를 조회하고 첫 브랜드를 선택합니다.
  useEffect(() => {
    const controller = new AbortController();

    const loadBrands = async () => {
      try {
        const data = await getTopBrands(controller.signal);
        if (controller.signal.aborted) return;

        setBrands(data);
        setSelectedNo(data[0]?.no ?? null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setBrandsError(error instanceof Error ? error.message : '브랜드 조회 실패');
      } finally {
        if (!controller.signal.aborted) setBrandsLoading(false);
      }
    };

    void loadBrands();
    return () => controller.abort();
  }, []);

  // 브랜드 전환 중 이전 요청이 늦게 끝나도 새 브랜드의 상품을 덮어쓰지 않습니다.
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

        // 판매중 상품만 최신 등록순으로 정렬하고 최대 3개 표시합니다.
        const visible = data
          .filter((product) => product.statusNo === 1)
          .sort((a, b) => b.no - a.no)
          .slice(0, 3)
          .map(toCardProduct);

        setProducts(visible);
      } catch (error) {
        if (cancelled) return;
        setProductsError(error instanceof Error ? error.message : '상품 조회 실패');
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };

    void loadProducts();
    return () => { cancelled = true; };
  }, [selectedNo]);

  const selectedBrand = brands.find((brand) => brand.no === selectedNo);

  // 브랜드 변경 즉시 기존 상품을 숨겨 다른 브랜드의 상품이 잠시 보이지 않게 합니다.
  const handleSelectBrand = (brandNo: number) => {
    if (brandNo === selectedNo) return;
    setProducts([]);
    setProductsError('');
    setProductsLoading(true);
    setSelectedNo(brandNo);
  };

  // 노출 설정한 브랜드가 없으면 메인 영역 자체를 숨깁니다.
  if (!brandsLoading && !brandsError && brands.length === 0) return null;

  return (
    <section className="top-brands">
      <div className="top-brands-inner">
        <div className="top-brands-heading">
          <h2>Top Brands</h2>
        </div>

        {brandsLoading && <p className="top-brands-message" role="status">브랜드를 불러오는 중입니다.</p>}
        {brandsError && <p className="top-brands-message" role="alert">{brandsError}</p>}

        {!brandsLoading && !brandsError && selectedBrand && (
          <>
            {/* 브랜드 로고 슬라이더: 로고가 없으면 브랜드명을 표시합니다. */}
            <div className="brand-slider-wrap">
              <button
                type="button"
                className="brand-prev"
                aria-label="이전 브랜드"
                onClick={() => brandSwiper.current?.slidePrev()}
              >
                ‹
              </button>

              <Swiper
                onSwiper={(swiper) => { brandSwiper.current = swiper; }}
                spaceBetween={20}
                slidesPerView={3}
                watchOverflow
                breakpoints={{
                  480: { slidesPerView: 3, spaceBetween: 18 },
                  769: { slidesPerView: 4, spaceBetween: 24 },
                  1025: { slidesPerView: 5, spaceBetween: 30 },
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
                      {brand.logoUrl
                        ? <img src={getImageUrl(brand.logoUrl)} alt={brand.name} />
                        : <span>{brand.name}</span>}
                    </button>
                  </SwiperSlide>
                ))}
              </Swiper>

              <button
                type="button"
                className="brand-next"
                aria-label="다음 브랜드"
                onClick={() => brandSwiper.current?.slideNext()}
              >
                ›
              </button>
            </div>

            <div className="top-brand-showcase">
              {/* 선택한 브랜드의 대표 이미지 */}
              <div className="top-brand-visual">
                {selectedBrand.visualUrl
                  ? <img
                    src={getImageUrl(selectedBrand.visualUrl)}
                    alt={`${selectedBrand.name} 브랜드 대표 이미지`}
                  />
                  : <div className="top-brand-visual-placeholder">{selectedBrand.name}</div>}
              </div>

              <div className="top-brand-content">
                {productsLoading && <p className="top-brands-message" role="status">상품을 불러오는 중입니다.</p>}
                {productsError && <p className="top-brands-message" role="alert">{productsError}</p>}
                {!productsLoading && !productsError && products.length === 0
                  && <p className="top-brands-message">판매 중인 상품이 없습니다.</p>}

                {!productsLoading && !productsError && products.length > 0 && (
                  <>
                    {/* PC·태블릿: 상품 3개 고정 */}
                    <div className="top-brand-products-desktop">
                      {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>

                    {/* 모바일: 2개씩 표시하고 좌우로 슬라이드 */}
                    <div className="top-brand-products-mobile">
                      <Swiper
                        key={selectedNo}
                        slidesPerView={2}
                        spaceBetween={12}
                        watchOverflow
                      >
                        {products.map((product) => (
                          <SwiperSlide key={product.id}>
                            <ProductCard product={product} />
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}