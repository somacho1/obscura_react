import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { addWishlist, checkWishlist, deleteWishlist } from '../../api/wishlistApi';
import type { Product } from '../../ts/product';

import './ProductCard.css';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const { member } = useAuth();

  // 현재 상품의 실제 찜 상태
  const [liked, setLiked] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // 로그인 회원의 현재 상품 찜 여부 조회
  useEffect(() => {
    const loadWishlistStatus = async () => {
      if (!member) {
        setLiked(false);
        return;
      }

      try {
        const wishlisted = await checkWishlist(member.no, product.id);
        setLiked(wishlisted);
      } catch (error) {
        console.error('찜 여부 조회 실패:', error);
      }
    };

    loadWishlistStatus();
  }, [member, product.id]);

  // 찜 등록 / 삭제
  const handleWishlist = async () => {
    if (!member) {
      const confirmed = window.confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?');
      if (confirmed) navigate('/login');
      return;
    }

    try {
      setWishlistLoading(true);

      if (liked) {
        await deleteWishlist(member.no, product.id);
        setLiked(false);
      } else {
        await addWishlist({ mno: member.no, pno: product.id });
        setLiked(true);
      }
    } catch (error) {
      console.error('찜 처리 실패:', error);
      if (error instanceof Error) alert(error.message);
      else alert('찜 처리에 실패했습니다.');
    } finally {
      setWishlistLoading(false);
    }
  };

  // 숫자 가격을 170000 → 170,000 형태로 변환
  const formatPrice = (price: number) => price.toLocaleString('ko-KR');

  return (
    <article className="product-card">
      {/* 상품 이미지 */}
      <Link to={`/products/${product.id}`} className="product-card-image">
        <img src={product.image} alt={product.name} />
      </Link>

      {/* 실제 DB 찜 버튼 */}
      <button
        type="button"
        className={`product-card-like ${liked ? 'active' : ''}`}
        aria-label={liked ? '찜 삭제' : '찜 추가'}
        aria-pressed={liked}
        disabled={wishlistLoading}
        onClick={handleWishlist}
      >
        <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
      </button>

      {/* 상품 정보 */}
      <div className="product-card-info">
        <p className="product-card-brand">{product.brand}</p>

        {product.comment && <p className="product-card-comment">{product.comment}</p>}

        <h3 className="product-card-name">
          <Link to={`/products/${product.id}`}>{product.name}</Link>
        </h3>

        <div className="product-card-price-wrap">
          {product.originalPrice && <del className="product-card-original-price">￦{formatPrice(product.originalPrice)}</del>}
          <strong className="product-card-price">￦{formatPrice(product.price)}</strong>
          {product.discountRate && <span className="product-card-discount">{product.discountRate}%</span>}
        </div>
      </div>
    </article>
  );
}