import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBrands } from '../../api/brandApi';
import { getProductsByBrand } from '../../api/productApi';
import ProductCard from '../../components/product/ProductCard';
import type { BrandResponse } from '../../ts/brand';
import type { Product, ProductResponse } from '../../ts/product';
import '../ProductListPage/ProductListPage.css';

// 서버 상품을 기존 공통 상품 카드 형식으로 변환합니다.
function toCardProduct(product: ProductResponse): Product {
    const name = (product.categoryName ?? '').toUpperCase();
    const category: Product['category'] =
        name === 'WOMEN' ? 'WOMEN'
            : name === 'SHOES' ? 'SHOES'
                : name === 'ACC' ? 'ACC'
                    : 'MEN';

    return {
        id: product.no,
        brand: product.brandName,
        name: product.name,
        price: product.salePrice,
        image: product.mainImageUrl ?? '',
        category,
        discountRate: product.discountRate > 0 ? product.discountRate : undefined,
        originalPrice: product.discountRate > 0 ? product.price : undefined,
    };
}

export default function BrandPage() {
    const { brandNo } = useParams<{ brandNo: string }>();
    const [brand, setBrand] = useState<BrandResponse | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const no = Number(brandNo);

        setBrand(null);
        setProducts([]);
        setLoading(true);
        setError('');

        // 브랜드관에 들어오면 화면 상단부터 표시합니다.
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

        async function loadBrand() {
            try {
                if (!Number.isSafeInteger(no) || no <= 0) {
                    throw new Error('올바르지 않은 브랜드 주소입니다.');
                }

                // 활성 브랜드인지 확인한 뒤 해당 브랜드 상품을 조회합니다.
                const brands = await getBrands();
                if (cancelled) return;

                const selectedBrand = brands.find(
                    (item) => item.no === no && item.statusNo === 1,
                );
                if (!selectedBrand) {
                    throw new Error('존재하지 않거나 운영이 중지된 브랜드입니다.');
                }

                const data = await getProductsByBrand(no);
                if (cancelled) return;

                setBrand(selectedBrand);
                setProducts(
                    data
                        .filter((item) => item.statusNo === 1 && item.bno === no)
                        .sort((a, b) => b.no - a.no)
                        .map(toCardProduct),
                );
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error ? err.message : '브랜드 상품을 불러오지 못했습니다.',
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadBrand();

        // 다른 브랜드로 이동하면 이전 조회 결과는 반영하지 않습니다.
        return () => { cancelled = true; };
    }, [brandNo, retryCount]);

    return (
        <div className="product-list-page">
            <header className="product-list-heading">
                <p className="product-list-heading__label">OBSCURA BRAND</p>
                <h1>{brand?.name ?? 'BRAND'}</h1>
                <nav className="product-list-categories" aria-label="상품 목록 이동">
                    <Link to="/products">ALL PRODUCTS</Link>
                </nav>
            </header>

            {loading ? (
                <div className="product-list-state" role="status">
                    브랜드 상품을 불러오는 중입니다.
                </div>
            ) : error ? (
                <div className="product-list-state" role="alert">
                    <p>{error}</p>
                    <button type="button" onClick={() => setRetryCount((value) => value + 1)}>
                        다시 시도
                    </button>
                </div>
            ) : (
                <>
                    <div className="product-list-toolbar">
                        <p>{products.length} PRODUCTS</p>
                    </div>

                    {products.length === 0 ? (
                        <div className="product-list-state">판매 중인 상품이 없습니다.</div>
                    ) : (
                        <section className="product-list-grid" aria-label={`${brand?.name} 상품 목록`}>
                            {products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}