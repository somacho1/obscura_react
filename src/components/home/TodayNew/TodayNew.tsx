import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';
import './TodayNew.css';

// 공통 상품 카드 컴포넌트
import ProductCard from '../../product/ProductCard';

// TODAY NEW에서 사용할 임시 상품 데이터
import { todayNewProducts } from '../../../data/products';

export default function TodayNew() {
    return (
        <section className="today-new">
            {/* TODAY NEW 제목 */}
            <div className="today-new-title">
                <h2>TODAY NEW</h2>
            </div>

            {/* 상품 Swiper 영역 */}
            <div className="today-new-slider">
                <Swiper
                    modules={[Navigation]}
                    navigation={{ prevEl: '.today-new-prev', nextEl: '.today-new-next' }}
                    spaceBetween={20}
                    slidesPerView={2}
                    breakpoints={{
                        769: { slidesPerView: 3 },
                        1025: { slidesPerView: 5 },
                        1401: { slidesPerView: 6 },
                    }}
                >
                    {/* 상품 데이터 개수만큼 ProductCard 자동 생성 */}
                    {todayNewProducts.map((product) => (
                        <SwiperSlide key={product.id}>
                            <ProductCard product={product} />
                        </SwiperSlide>
                    ))}
                </Swiper>

                {/* 이전 / 다음 상품 버튼 */}
                <button type="button" className="today-new-prev" aria-label="이전 상품">‹</button>
                <button type="button" className="today-new-next" aria-label="다음 상품">›</button>
            </div>
        </section>
    );
}