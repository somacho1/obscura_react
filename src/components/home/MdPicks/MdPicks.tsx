import { useEffect, useState } from 'react';
import './MdPicks.css';

import ProductCard from '../../product/ProductCard';
import { getMdPicks } from '../../../api/productApi';
import type { Product } from '../../../ts/product';

export default function MdPicks() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        let active = true;

        const loadProducts = async () => {
            setLoading(true);
            setError('');

            try {
                // 판매 중인 추천 상품을 관리자 지정 순서로 최대 5개 조회합니다.
                const data = await getMdPicks(5);
                if (!active) return;

                setProducts(data.map(product => ({
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
                })));
            } catch (err) {
                if (active) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : '추천 상품을 불러오지 못했습니다.',
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
        <section className="md-picks">
            <div className="md-picks-title">
                <h2>MD’s Picks</h2>
            </div>

            {loading && <p role="status">추천 상품을 불러오는 중입니다.</p>}

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
                <p>준비 중인 컬렉션입니다.</p>
            )}

            {!loading && !error && products.length > 0 && (
                <div className="md-picks-products">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </section>
    );
}