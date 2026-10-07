import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scrollbar } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';
import 'swiper/css/scrollbar';
import './BestSellers.css';

import ProductCard from '../../product/ProductCard';
import { getProductPage } from '../../../api/productApi';
import { getActiveCategories } from '../../../api/categoryApi';
import type { Product } from '../../../ts/product';

const BEST_SIZE = 12;
const CATEGORY_MENU = ['WOMEN', 'MEN', 'ACC'] as const;

export default function BestSellers() {
  const [category, setCategory] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      setLoading(true);
      setError('');
      setProducts([]);

      try {
        let cno: number | undefined;

        // 메뉴 이름에 해당하는 실제 DB 카테고리 번호를 찾습니다.
        if (category) {
          const categories = await getActiveCategories();
          if (!active) return;

          const selected = categories.find(
            item => item.name.trim().toUpperCase() === category,
          );

          if (!selected) {
            throw new Error('아직 등록되지 않은 카테고리입니다.');
          }

          cno = selected.no;
        }

        // 서버에서 취소 수량을 제외한 판매량순으로 조회합니다.
        const data = await getProductPage({
          cno,
          page: 1,
          size: BEST_SIZE,
          sort: 'POPULAR',
        });

        if (!active) return;

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

        setProducts(convertedProducts);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : '인기 상품을 불러오지 못했습니다.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProducts();

    // 이전 카테고리의 응답이 현재 목록을 덮어쓰지 않도록 합니다.
    return () => {
      active = false;
    };
  }, [category, retryCount]);

  return (
    <section className="best-sellers">
      <div className="best-sellers-menu">
        <h2>Best Sellers</h2>

        {/* 전체 상품 목록도 인기순으로 연결합니다. */}
        <Link to="/products?sort=POPULAR" className="best-all">
          ALL &gt;
        </Link>

        <ul>
          <li>
            <button
              type="button"
              className={category === '' ? 'active' : ''}
              aria-pressed={category === ''}
              onClick={() => setCategory('')}
            >
              ALL
            </button>
          </li>

          {CATEGORY_MENU.map(item => (
            <li key={item}>
              <button
                type="button"
                className={category === item ? 'active' : ''}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="best-sellers-products">
        {loading && (
          <p role="status">인기 상품을 불러오는 중입니다.</p>
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
          <p>등록된 상품이 없습니다.</p>
        )}

        {!loading && !error && products.length > 0 && (
          <Swiper
            key={category}
            modules={[Scrollbar]}
            scrollbar={{ draggable: true }}
            watchOverflow
            spaceBetween={20}
            slidesPerView={2}
            breakpoints={{
              769: { slidesPerView: 3 },
              1025: { slidesPerView: 4 },
            }}
          >
            {/* 순위는 현재 선택한 카테고리 안에서 표시합니다. */}
            {products.map((product, index) => (
              <SwiperSlide key={product.id}>
                <div className="best-product">
                  <span className="best-rank">{index + 1}</span>
                  <ProductCard product={product} />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </section>
  );
}