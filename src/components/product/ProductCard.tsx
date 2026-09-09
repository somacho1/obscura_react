import { useState } from 'react';
import type { Product } from '../../types/product';
import './ProductCard.css';

// 부모 컴포넌트가 ProductCard에 전달해야 하는 값
interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  // 현재 상품의 찜 상태 - 추후 회원 찜 API와 연결
  const [liked, setLiked] = useState(false);

  // 숫자 가격을 170000 → 170,000 형태로 변환
  const formatPrice = (price: number) => price.toLocaleString('ko-KR');

  return (
    <article className="product-card">
      {/* 상품 이미지 - 추후 상품 상세 페이지 링크로 변경 */}
      <a href="#" className="product-card-image">
        <img src={product.image} alt={product.name} />
      </a>

      {/* 찜 버튼 - 현재는 화면에서 상태만 변경 */}
      <button type="button" className={`product-card-like ${liked ? 'active' : ''}`}
        aria-label={liked ? '찜 삭제' : '찜 추가'} aria-pressed={liked}
        onClick={() => setLiked((prev) => !prev)}>
        <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
      </button>

      {/* 상품 정보 */}
      <div className="product-card-info">
        <p className="product-card-brand">{product.brand}</p>

        {/* comment 값이 있는 상품만 출력 */}
        {product.comment && <p className="product-card-comment">{product.comment}</p>}

        <h3 className="product-card-name">
          <a href="#">{product.name}</a>
        </h3>

        {/* 가격 영역 */}
        <div className="product-card-price-wrap">
          {/* 할인 전 가격이 있으면 취소선 가격 표시 */}
          {product.originalPrice && (
            <del className="product-card-original-price">
              ￦{formatPrice(product.originalPrice)}
            </del>
          )}

          <strong className="product-card-price">￦{formatPrice(product.price)}</strong>

          {/* 할인 상품에만 할인율 표시 */}
          {product.discountRate && (
            <span className="product-card-discount">{product.discountRate}%</span>
          )}
        </div>
      </div>
    </article>
  );
}