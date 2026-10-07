import { useEffect, useState } from 'react';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';
import './TodayNew.css';

import ProductCard from '../../product/ProductCard';
import { getProductPage } from '../../../api/productApi';
import type { Product } from '../../../ts/product';

// 메인 신상품 영역에 표시할 최대 상품 수
const TODAY_NEW_SIZE = 12;

export default function TodayNew() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        // 화면을 벗어난 뒤 이전 요청의 결과가 반영되지 않도록 합니다.
        let active = true;

        const loadProducts = async () => {
            setLoading(true);
            setError('');

            try {
                // 서버에서 판매 중인 상품을 등록일·상품번호 내림차순으로 조회합니다.
                const data = await getProductPage({
                    page: 1,
                    size: TODAY_NEW_SIZE,
                    sort: 'LATEST',
                });

                // API 응답을 기존 공통 상품 카드 형식으로 변환합니다.
                const convertedProducts: Product[] = data.content.map(product => ({
                    id: product.no,
                    brand: product.brandName,
                    name: product.name,
                    price: product.salePrice,
                    image: product.mainImageUrl ?? '',
                    category: product.categoryName as Product['category'],
                    discountRate: product.discountRate > 0
                        ? product.discountRate
                        : undefined,
                    originalPrice: product.discountRate > 0
                        ? product.price
                        : undefined,
                }));

                if (active) setProducts(convertedProducts);
            } catch (err) {
                if (active) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : '신상품을 불러오지 못했습니다.',
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        void loadProducts();

        return () => {
            active = false;
        };
    }, [retryCount]);

    return (
        <section className="today-new">
            <div className="today-new-title">
                <h2>TODAY NEW</h2>
            </div>

            <div className="today-new-slider">
                {loading && (
                    <p role="status">상품을 불러오는 중입니다.</p>
                )}

                {!loading && error && (
                    <div role="alert">
                        <p>{error}</p>
                        <button
                            type="button"
                            onClick={() => setRetryCount(prev => prev + 1)}
                        >
                            다시 조회
                        </button>
                    </div>
                )}

                {!loading && !error && products.length === 0 && (
                    <p>등록된 신상품이 없습니다.</p>
                )}

                {!loading && !error && products.length > 0 && (
                    <>
                        <Swiper
                            modules={[Navigation]}
                            navigation={{
                                prevEl: '.today-new-prev',
                                nextEl: '.today-new-next',
                            }}
                            watchOverflow
                            spaceBetween={20}
                            slidesPerView={2}
                            breakpoints={{
                                769: { slidesPerView: 3 },
                                1025: { slidesPerView: 4 },
                                1401: { slidesPerView: 5 },
                            }}
                        >
                            {products.map(product => (
                                <SwiperSlide key={product.id}>
                                    <ProductCard product={product} />
                                </SwiperSlide>
                            ))}
                        </Swiper>

                        {/* 상품 수가 부족하면 Swiper가 이동 버튼을 잠급니다. */}
                        <button
                            type="button"
                            className="today-new-prev"
                            aria-label="이전 상품"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M14.5 4.5L7 12L14.5 19.5" stroke="currentColor" strokeWidth="1.2" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            className="today-new-next"
                            aria-label="다음 상품"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M9.5 4.5L17 12L9.5 19.5" stroke="currentColor" strokeWidth="1.2" />
                            </svg>
                        </button>
                    </>
                )}
            </div>
        </section>
    );
}