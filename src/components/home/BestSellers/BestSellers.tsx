import { Scrollbar } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/scrollbar';
import './BestSellers.css';

import ProductCard from '../../product/ProductCard';
import { bestProducts } from '../../../data/products';

export default function BestSellers() {
  return (
    <section className="best-sellers">
      {/* 왼쪽 제목 / 카테고리 영역 */}
      <div className="best-sellers-menu">
        <h2>Best Sellers</h2>
        <a href="#" className="best-all">ALL &gt;</a>

        <ul>
          <li><a href="#">WOMEN</a></li>
          <li><a href="#">MEN</a></li>
          <li><a href="#">ACC</a></li>
        </ul>
      </div>

      {/* 오른쪽 BEST 상품 슬라이더 */}
      <div className="best-sellers-products">
        <Swiper
          modules={[Scrollbar]}
          scrollbar={{ draggable:true }}
          spaceBetween={20}
          slidesPerView={2}
          breakpoints={{ 769:{ slidesPerView:3 }, 1025:{ slidesPerView:4 } }}
        >
          {/* ProductCard는 재사용하고 순위만 BEST 영역에서 추가 */}
          {bestProducts.map((product, index) => (
            <SwiperSlide key={product.id}>
              <div className="best-product">
                <span className="best-rank">{index + 1}</span>
                <ProductCard product={product} />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}