import { Autoplay, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';
import 'swiper/css/pagination';
import './Hero.css';

// 기존 Obscura 메인 배너 이미지
import mainImage01 from '../../../assets/images/obscura/main1.jfif';
import mainImage02 from '../../../assets/images/obscura/main_2 ojos.jpg';
import mainImage03 from '../../../assets/images/obscura/main 032c_2.jpg';

// 배너 데이터 - 나중에 이미지/링크가 늘어나도 여기서 관리
const heroSlides = [
    { id: 1, image: mainImage01, alt: 'OBSCURA 메인 배너 1' },
    { id: 2, image: mainImage02, alt: 'OBSCURA 메인 배너 2' },
    { id: 3, image: mainImage03, alt: 'OBSCURA 메인 배너 3' },
];

export default function Hero() {
    return (
        <section className="hero" aria-label="메인 프로모션">
            <Swiper
                className="hero-swiper"
                modules={[Autoplay, Pagination]}
                slidesPerView={1}
                loop={true}
                speed={800}
                pagination={{ clickable: true }}
                autoplay={{ delay: 4000, disableOnInteraction: false }}
            >
                {/* heroSlides 데이터를 이용해 배너 자동 생성 */}
                {heroSlides.map((slide) => (
                    <SwiperSlide key={slide.id}>
                        <div className="hero-slide">
                            <img src={slide.image} alt={slide.alt} />
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    );
}