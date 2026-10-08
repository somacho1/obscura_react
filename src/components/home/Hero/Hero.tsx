import { useEffect, useState } from 'react';
import { Autoplay, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { getActiveMainBanners } from '../../../api/mainBannerApi';
import type { MainBannerResponse } from '../../../ts/mainBanner';
import { getImageUrl } from '../../../ts/imageUrl';
import 'swiper/css';
import 'swiper/css/pagination';
import './Hero.css';

export default function Hero() {
    const [slides, setSlides] = useState<MainBannerResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError('');

        getActiveMainBanners(controller.signal)
            .then((data) => {
                if (controller.signal.aborted) return;
                setSlides(data.filter((banner) => Boolean(banner.imageUrl)));
            })
            .catch((error) => {
                if (controller.signal.aborted) return;
                setError(error instanceof Error ? error.message : '배너를 불러오지 못했습니다.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [reloadKey]);

    // 등록된 노출 배너가 없으면 Hero 영역을 숨깁니다.
    if (!loading && !error && slides.length === 0) return null;

    const multiple = slides.length > 1;

    return (
        <section className="hero" aria-label="메인 프로모션">
            {loading ? (
                <div className="hero-message" role="status">배너를 불러오는 중입니다.</div>
            ) : error ? (
                <div className="hero-message" role="alert">
                    <p>배너를 불러오지 못했습니다.</p>
                    <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
                        다시 불러오기
                    </button>
                </div>
            ) : (
                <Swiper
                    className="hero-swiper"
                    modules={[Autoplay, Pagination]}
                    slidesPerView={1}
                    loop={multiple}
                    speed={800}
                    pagination={multiple ? { clickable: true } : false}
                    autoplay={multiple ? { delay: 4000, disableOnInteraction: false } : false}
                    watchOverflow
                >
                    {slides.map((slide, index) => (
                        <SwiperSlide key={slide.no}>
                            <div className="hero-slide">
                                <img
                                    src={getImageUrl(slide.imageUrl)}
                                    alt={slide.altText ?? ''}
                                    loading={index === 0 ? 'eager' : 'lazy'}
                                />
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            )}
        </section>
    );
}