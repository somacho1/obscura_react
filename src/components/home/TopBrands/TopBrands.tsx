import { useState } from 'react';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import './TopBrands.css';

// 브랜드 로고
import youthLogo from '../../../assets/images/obscura/Rectangle 72.png';
import hopeLogo from '../../../assets/images/obscura/Rectangle 73.png';
import logo032c from '../../../assets/images/obscura/032c_logo.png';
import eytysLogo from '../../../assets/images/obscura/Rectangle 74.png';
import sansanLogo from '../../../assets/images/obscura/Rectangle 75.png';
import openyyLogo from '../../../assets/images/obscura/Rectangle 76.png';

// 현재 032c 대표 이미지 / 상품 이미지
import main032c from '../../../assets/images/obscura/MdPick-032c_wide3.webp';
import product01 from '../../../assets/images/obscura/MdPick-032c_1.jpg';
import product02 from '../../../assets/images/obscura/MdPick032c_2.jpg';
import product03 from '../../../assets/images/obscura/MdPick-032c_3.jpg';

interface Brand {
  id:number;
  name:string;
  logo:string;
}

interface BrandProduct {
  id:number;
  name:string;
  price:number;
  image:string;
}

const brands:Brand[] = [
  { id:1, name:'YOUTH', logo:youthLogo },
  { id:2, name:'HOPE', logo:hopeLogo },
  { id:3, name:'032c', logo:logo032c },
  { id:4, name:'EYTYS', logo:eytysLogo },
  { id:5, name:'SAN SAN GEAR', logo:sansanLogo },
  { id:6, name:'OPEN YY', logo:openyyLogo },
];

const products:BrandProduct[] = [
  { id:1, name:'[032c] “Clay” Utility Bomber Jacket', price:1830000, image:product01 },
  { id:2, name:'[032c] “Clay” Utility Trousers', price:980000, image:product02 },
  { id:3, name:'[032c] Leather Keychain', price:190000, image:product03 },
];

export default function TopBrands() {
  const [selectedBrand, setSelectedBrand] = useState('032c');
  const [likedProducts, setLikedProducts] = useState<number[]>([]);

  // 상품 찜 ON / OFF
  const toggleLike = (id:number) => {
    setLikedProducts((prev) =>
      prev.includes(id)
        ? prev.filter((productId) => productId !== id)
        : [...prev, id]
    );
  };

  const formatPrice = (price:number) => price.toLocaleString('ko-KR');

  return (
    <section className="top-brands">
      <div className="top-brands-inner">

        {/* 제목 */}
        <div className="top-brands-heading">
          <h2>Top Brands</h2>
        </div>

        {/* =========================
            브랜드 로고 슬라이더
            < 브랜드 브랜드 브랜드 >
        ========================= */}
        <div className="brand-slider-wrap">
          <button type="button" className="brand-prev" aria-label="이전 브랜드">‹</button>

          <Swiper
            modules={[Navigation]}
            navigation={{
              prevEl:'.brand-prev',
              nextEl:'.brand-next',
            }}
            spaceBetween={20}
            slidesPerView={3}
            breakpoints={{
              480:{
                slidesPerView:3,
                spaceBetween:18,
              },
              769:{
                slidesPerView:4,
                spaceBetween:24,
              },
              1025:{
                slidesPerView:5,
                spaceBetween:30,
              },
            }}
          >
            {brands.map((brand) => (
              <SwiperSlide key={brand.id}>
                <button
                  type="button"
                  className={`top-brand-tab ${selectedBrand === brand.name ? 'active' : ''}`}
                  onClick={() => setSelectedBrand(brand.name)}
                  aria-label={`${brand.name} 브랜드 보기`}
                >
                  <img src={brand.logo} alt={brand.name} />
                </button>
              </SwiperSlide>
            ))}
          </Swiper>

          <button type="button" className="brand-next" aria-label="다음 브랜드">›</button>
        </div>

        {/* =========================
            브랜드 쇼케이스
        ========================= */}
        <div className="top-brand-showcase">

          {/* 대표 이미지 */}
          <div className="top-brand-visual">
            <img src={main032c} alt="032c 브랜드 대표 이미지" />
          </div>

          {/* 상품 영역 */}
          <div className="top-brand-content">

            {/* =========================
                PC + TABLET
                상품 3개 고정
            ========================= */}
            <div className="top-brand-products-desktop">
              {products.map((product) => {
                const liked = likedProducts.includes(product.id);

                return (
                  <article className="top-brand-product" key={product.id}>
                    <div className="top-brand-product-image">
                      <img src={product.image} alt={product.name} />

                      <button
                        type="button"
                        className={`top-brand-like ${liked ? 'active' : ''}`}
                        aria-label={liked ? '찜 삭제' : '찜 추가'}
                        aria-pressed={liked}
                        onClick={() => toggleLike(product.id)}
                      >
                        <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
                      </button>
                    </div>

                    <div className="top-brand-product-info">
                      <p>{product.name}</p>
                      <strong>￦{formatPrice(product.price)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* =========================
                MOBILE
                768px 이하부터 정확히 2개씩 Swiper
            ========================= */}
            <div className="top-brand-products-mobile">
              <Swiper
                spaceBetween={12}
                slidesPerView={2}
              >
                {products.map((product) => {
                  const liked = likedProducts.includes(product.id);

                  return (
                    <SwiperSlide key={product.id}>
                      <article className="top-brand-product">
                        <div className="top-brand-product-image">
                          <img src={product.image} alt={product.name} />

                          <button
                            type="button"
                            className={`top-brand-like ${liked ? 'active' : ''}`}
                            aria-label={liked ? '찜 삭제' : '찜 추가'}
                            aria-pressed={liked}
                            onClick={() => toggleLike(product.id)}
                          >
                            <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
                          </button>
                        </div>

                        <div className="top-brand-product-info">
                          <p>{product.name}</p>
                          <strong>￦{formatPrice(product.price)}</strong>
                        </div>
                      </article>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}