import { useEffect, useState } from 'react';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';
import './TodayNew.css';

// 공통 상품 카드 컴포넌트
import ProductCard from '../../product/ProductCard';

// Spring Boot 상품 API
import { getActiveProducts } from '../../../api/productApi';

// 상품 타입
import type { Product, ProductResponse } from '../../../ts/product';

export default function TodayNew() {
    // ProductCard에 전달할 실제 상품 데이터
    const [products, setProducts] = useState<Product[]>([]);

    // 상품 로딩 여부
    const [loading, setLoading] = useState(true);

    // 상품 조회 오류 메시지
    const [error, setError] = useState('');

    useEffect(() => {
        // Spring Boot에서 판매중인 상품 조회
        const loadProducts = async () => {
            try {
                setLoading(true);
                setError('');

                // GET http://localhost:9101/api/products/active
                const data: ProductResponse[] = await getActiveProducts();

                /*
                 * 백엔드 ProductResponse를
                 * 기존 ProductCard에서 사용하는 Product 형태로 변환
                 */
                const convertedProducts: Product[] = data.map((product) => ({
                    id: product.no,
                    brand: product.brandName,
                    name: product.name,

                    // 할인 적용된 최종 판매가격
                    price: product.salePrice,

                    // PRODUCTIMAGE의 MAIN 이미지
                    image: product.mainImageUrl ?? '',

                    // CATEGORY의 카테고리명
                    category: product.categoryName as Product['category'],

                    // 할인율이 있을 때만 표시
                    discountRate:
                        product.discountRate > 0
                            ? product.discountRate
                            : undefined,

                    // 할인 상품일 경우 기존 정가 표시
                    originalPrice:
                        product.discountRate > 0
                            ? product.price
                            : undefined,
                }));

                setProducts(convertedProducts);
            } catch (error) {
                console.error('TODAY NEW 상품 조회 실패:', error);
                setError('상품을 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, []);

    return (
        <section className="today-new">
            {/* TODAY NEW 제목 */}
            <div className="today-new-title">
                <h2>TODAY NEW</h2>
            </div>

            {/* 상품 Swiper 영역 */}
            <div className="today-new-slider">

                {/* API 요청 중 */}
                {loading && (
                    <p>상품을 불러오는 중입니다.</p>
                )}

                {/* API 요청 실패 */}
                {!loading && error && (
                    <p>{error}</p>
                )}

                {/* API 요청 성공 */}
                {!loading && !error && (
                    <Swiper
                        modules={[Navigation]}
                        navigation={{
                            prevEl: '.today-new-prev',
                            nextEl: '.today-new-next',
                        }}
                        spaceBetween={20}
                        slidesPerView={2}
                        breakpoints={{
                            769: { slidesPerView: 3 },
                            1025: { slidesPerView: 5 },
                            1401: { slidesPerView: 6 },
                        }}
                    >
                        {/* DB 상품 데이터 개수만큼 ProductCard 자동 생성 */}
                        {products.map((product) => (
                            <SwiperSlide key={product.id}>
                                <ProductCard product={product} />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                )}

                {/* 이전 / 다음 상품 버튼 */}
                <button
                    type="button"
                    className="today-new-prev"
                    aria-label="이전 상품"
                >
                    ‹
                </button>

                <button
                    type="button"
                    className="today-new-next"
                    aria-label="다음 상품"
                >
                    ›
                </button>
            </div>
        </section>
    );
}