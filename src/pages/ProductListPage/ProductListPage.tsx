import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../../components/product/ProductCard';
import { getActiveCategories } from '../../api/categoryApi';
import { getProductPage } from '../../api/productApi';
import type { Product, ProductPageResponse, ProductResponse, ProductSortType } from '../../ts/product';
import './ProductListPage.css';

// 카테고리별로 페이지 파일을 만들지 않고 URL 조건으로 구분합니다.
const CATEGORY_MENU = ['MEN', 'WOMEN', 'SHOES', 'ACC'] as const;
const SORT_OPTIONS: ProductSortType[] = ['LATEST', 'PRICE_LOW', 'PRICE_HIGH'];
const PAGE_SIZE = 24;

// 백엔드 상품 데이터를 기존 ProductCard의 구조로 변환합니다.
function toCardProduct(product: ProductResponse): Product {
    return {
        id: product.no,
        brand: product.brandName,
        name: product.name,
        price: product.salePrice,
        image: product.mainImageUrl ?? '',
        category: product.categoryName as Product['category'],
        discountRate: product.discountRate > 0 ? product.discountRate : undefined,
        originalPrice: product.discountRate > 0 ? product.price : undefined,
    };
}

// 페이지 이동·정렬 변경 시 즉시 목록 상단으로 이동합니다.
function scrollToTop() {
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    root.style.scrollBehavior = previousBehavior;
}

export default function ProductListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const category = (searchParams.get('category') ?? '').trim().toUpperCase();
    const isSale = category === 'SALE';
    const keyword = (searchParams.get('keyword') ?? '').trim();
    const title = keyword ? 'SEARCH RESULTS' : category || 'ALL PRODUCTS';

    // URL의 페이지·정렬값을 읽습니다. 잘못된 값은 기본값으로 처리합니다.
    const requestedPage = Number(searchParams.get('page') ?? '1');
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const requestedSort = searchParams.get('sort') ?? 'LATEST';
    const sort: ProductSortType = SORT_OPTIONS.includes(requestedSort as ProductSortType) ? requestedSort as ProductSortType : 'LATEST';

    const [pageData, setPageData] = useState<ProductPageResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    // 카테고리·페이지·정렬 변경 시 서버에서 해당 페이지의 상품을 조회합니다.
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        setPageData(null);

        async function loadProducts() {
            try {
                let cno: number | undefined;

                // MEN 등의 메뉴 이름으로 DB에 등록된 실제 카테고리 번호를 찾습니다.
                if (category && !isSale) {
                    if (!CATEGORY_MENU.some(item => item === category)) {
                        throw new Error('존재하지 않는 카테고리입니다.');
                    }
                    const categories = await getActiveCategories();
                    if (cancelled) return;
                    const selectedCategory = categories.find(item => item.name.trim().toUpperCase() === category);
                    if (!selectedCategory) throw new Error('아직 등록되지 않은 카테고리입니다.');
                    cno = selectedCategory.no;
                }

                // 검색어가 있으면 검색 결과를, 없으면 기존 상품 목록을 조회합니다.
                const result = await getProductPage({ cno, saleOnly: isSale, page, size: PAGE_SIZE, sort, keyword });
                if (cancelled) return;

                // 상품 삭제 등으로 요청한 페이지가 사라졌다면 마지막 유효 페이지로 이동합니다.
                const lastPage = Math.max(1, result.totalPages);
                if (page > lastPage) {
                    setSearchParams(previous => {
                        const next = new URLSearchParams(previous);
                        next.set('page', String(lastPage));
                        return next;
                    }, { replace: true });
                    return;
                }

                setPageData(result);
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : '상품 목록을 불러오지 못했습니다.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadProducts();
        // 이전 요청이 늦게 완료되어 현재 목록을 덮어쓰는 것을 막습니다.
        return () => { cancelled = true; };
    }, [category, isSale, page, sort, keyword, retryCount, setSearchParams]);

    // 페이지 이동 시 카테고리·정렬 조건은 유지합니다.
    const changePage = (nextPage: number) => {
        if (loading || !pageData || nextPage < 1 || nextPage > pageData.totalPages || nextPage === page) return;
        setSearchParams(previous => {
            const next = new URLSearchParams(previous);
            next.set('page', String(nextPage));
            return next;
        });
        scrollToTop();
    };

    // 정렬 변경 시 새 정렬 결과의 첫 페이지부터 보여줍니다.
    const changeSort = (nextSort: ProductSortType) => {
        setSearchParams(previous => {
            const next = new URLSearchParams(previous);
            next.set('sort', nextSort);
            next.set('page', '1');
            return next;
        });
        scrollToTop();
    };

    // 페이지 번호는 5개씩 표시합니다. 예: 1~5, 6~10.
    const totalPages = pageData?.totalPages ?? 0;
    const startPage = Math.floor((page - 1) / 5) * 5 + 1;
    const pageNumbers = Array.from(
        { length: Math.max(0, Math.min(5, totalPages - startPage + 1)) },
        (_, index) => startPage + index
    );

    return (
        <div className="product-list-page">
            {/* 제목과 카테고리 메뉴: 카테고리를 바꾸면 첫 페이지·최신순으로 시작합니다. */}
            <header className="product-list-heading">
                <p className="product-list-heading__label">OBSCURA COLLECTION</p>
                <h1>{title}</h1>
                {/* 검색 결과 화면에서 입력한 검색어를 표시합니다. */}
                {keyword && <p className="product-list-search-keyword">“{keyword}” 검색 결과</p>}
                <nav className="product-list-categories" aria-label="상품 카테고리">
                    <Link to="/products" className={!category ? 'active' : ''} aria-current={!category ? 'page' : undefined} onClick={scrollToTop}>ALL</Link>
                    {CATEGORY_MENU.map(item => (
                        <Link key={item} to={`/products?category=${item}`} className={category === item ? 'active' : ''} aria-current={category === item ? 'page' : undefined} onClick={scrollToTop}>{item}</Link>
                    ))}
                    <Link to="/products?category=SALE" className={isSale ? 'active' : ''} aria-current={isSale ? 'page' : undefined} onClick={scrollToTop}>SALE</Link>
                </nav>
            </header>

            {/* 현재 페이지 상품 수가 아니라 조건에 맞는 전체 상품 수를 표시합니다. */}
            <div className="product-list-toolbar">
                <p>{loading ? 'LOADING...' : error ? 'PRODUCTS' : `${pageData?.totalElements ?? 0} PRODUCTS`}</p>
                <label className="product-list-sort">
                    <span className="product-list-sr-only">상품 정렬</span>
                    <select value={sort} onChange={event => changeSort(event.target.value as ProductSortType)} disabled={loading || !!error}>
                        <option value="LATEST">최신순</option>
                        <option value="PRICE_LOW">낮은 가격순</option>
                        <option value="PRICE_HIGH">높은 가격순</option>
                    </select>
                </label>
            </div>

            {/* 조회 상태와 현재 페이지 상품 목록 */}
            {loading ? (
                <div className="product-list-state" role="status">상품을 불러오는 중입니다.</div>
            ) : error ? (
                <div className="product-list-state" role="alert">
                    <p>{error}</p>
                    <button type="button" onClick={() => setRetryCount(count => count + 1)}>다시 시도</button>
                </div>
            ) : !pageData || pageData.content.length === 0 ? (
                <div className="product-list-state">
                    {keyword ? '검색 결과가 없습니다. 다른 검색어로 검색해주세요.' : '등록된 상품이 없습니다.'}
                </div>
            ) : (
                <>
                    <section className="product-list-grid" aria-label={`${title} 상품 목록`}>
                        {pageData.content.map(product => <ProductCard key={product.no} product={toCardProduct(product)} />)}
                    </section>

                    {/* 두 페이지 이상일 때만 페이지 이동 버튼을 표시합니다. */}
                    {totalPages > 1 && (
                        <nav className="product-list-pagination" aria-label="상품 목록 페이지">
                            <button type="button" onClick={() => changePage(page - 1)} disabled={page === 1}>이전</button>
                            {pageNumbers.map(number => (
                                <button key={number} type="button" className={page === number ? 'active' : ''} aria-current={page === number ? 'page' : undefined} aria-label={`${number}페이지`} onClick={() => changePage(number)}>{number}</button>
                            ))}
                            <button type="button" onClick={() => changePage(page + 1)} disabled={page === totalPages}>다음</button>
                        </nav>
                    )}
                </>
            )}
        </div>
    );
}