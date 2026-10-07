import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getWishlistsByMember, deleteWishlist } from '../../api/wishlistApi';
import { getProduct } from '../../api/productApi';
import { getImageUrl } from '../../ts/imageUrl';
import type { ProductResponse } from '../../ts/product';
import './MyWishlistPage.css';

export default function MyWishlistPage() {
    const { member } = useAuth();
    const memberNo = member?.no;
    const [products, setProducts] = useState<ProductResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [retry, setRetry] = useState(0);
    const [deletingNos, setDeletingNos] = useState<number[]>([]);
    const deletingRef = useRef(new Set<number>());

    // 회원 변경 후 이전 요청 결과가 화면에 반영되지 않도록 구분합니다.
    const requestVersion = useRef(0);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    useEffect(() => {
        const version = ++requestVersion.current;
        let active = true;
        setProducts([]);
        setError('');
        setNotice('');
        setDeletingNos([]);
        deletingRef.current.clear();

        if (!memberNo) {
            setLoading(false);
            return;
        }

        async function load() {
            setLoading(true);

            try {
                const wishlists = await getWishlistsByMember(memberNo!);
                const productNos = [...new Set(wishlists.map((item) => item.pno))];

                // 하나의 상품 조회 실패로 전체 찜 목록이 사라지지 않게 처리합니다.
                const results = await Promise.allSettled(productNos.map(getProduct));
                const loaded: ProductResponse[] = [];
                let failedCount = 0;

                results.forEach((result) => {
                    if (result.status === 'fulfilled') loaded.push(result.value);
                    else failedCount += 1;
                });

                if (!active) return;
                setProducts(loaded);

                if (failedCount > 0) {
                    setNotice(`${failedCount}개 상품의 정보를 불러오지 못했습니다. 잠시 후 다시 조회해주세요.`);
                }
            } catch (err) {
                if (active) {
                    setError(err instanceof Error ? err.message : '찜 목록을 불러오지 못했습니다.');
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        void load();

        return () => {
            active = false;
            if (requestVersion.current === version) requestVersion.current += 1;
        };
    }, [memberNo, retry]);

    async function handleDelete(productNo: number) {
        if (!memberNo || deletingRef.current.has(productNo)) return;

        const version = requestVersion.current;
        deletingRef.current.add(productNo);
        setDeletingNos((prev) => [...prev, productNo]);
        setError('');

        try {
            await deleteWishlist(memberNo, productNo);

            if (requestVersion.current === version) {
                setProducts((prev) => prev.filter((product) => product.no !== productNo));
            }
        } catch (err) {
            if (requestVersion.current === version) {
                setError(err instanceof Error ? err.message : '찜 삭제에 실패했습니다.');
            }
        } finally {
            if (requestVersion.current === version) {
                deletingRef.current.delete(productNo);
                setDeletingNos((prev) => prev.filter((no) => no !== productNo));
            }
        }
    }

    return (
        <main className="my-wishlist">
            <header className="my-wishlist__heading">
                <div>
                    <span className="my-wishlist__eyebrow">OBSCURA / MY PAGE</span>
                    <h1>Wishlist</h1>
                    <p>찜한 상품</p>
                </div>
                <Link className="my-wishlist__back" to="/mypage">마이페이지 ↗</Link>
            </header>

            {!member ? (
                <div className="my-wishlist__state">
                    <p>로그인 후 이용하실 수 있습니다.</p>
                    <Link className="my-wishlist__button" to="/login">로그인</Link>
                </div>
            ) : (
                <>
                    {error && (
                        <div className="my-wishlist__message" role="alert">
                            <p>{error}</p>
                            <button type="button" onClick={() => setRetry((prev) => prev + 1)}>
                                다시 조회
                            </button>
                        </div>
                    )}

                    {notice && (
                        <div className="my-wishlist__message" role="status">
                            <p>{notice}</p>
                            <button type="button" onClick={() => setRetry((prev) => prev + 1)}>
                                다시 조회
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="my-wishlist__state" role="status">찜한 상품을 불러오는 중입니다.</div>
                    ) : products.length > 0 ? (
                        <>
                            <div className="my-wishlist__summary">
                                <span>조회된 상품 <strong>{products.length}</strong></span>
                            </div>

                            <div className="my-wishlist__grid">
                                {products.map((product) => {
                                    const deleting = deletingNos.includes(product.no);
                                    const onSale = product.discountRate > 0;

                                    return (
                                        <article className="my-wishlist__card" key={product.no}>
                                            <Link className="my-wishlist__image" to={`/products/${product.no}`}>
                                                {product.mainImageUrl ? (
                                                    <img
                                                        src={getImageUrl(product.mainImageUrl)}
                                                        alt={product.name}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <span>이미지 준비 중</span>
                                                )}
                                            </Link>

                                            <button
                                                type="button"
                                                className="my-wishlist__remove"
                                                aria-label={`${product.name} 찜 삭제`}
                                                disabled={deleting}
                                                onClick={() => void handleDelete(product.no)}
                                            >
                                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                                    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
                                                </svg>
                                            </button>

                                            <div className="my-wishlist__info">
                                                <p className="my-wishlist__brand">{product.brandName}</p>
                                                <h2>
                                                    <Link to={`/products/${product.no}`}>{product.name}</Link>
                                                </h2>

                                                {/* 판매중지 상품도 찜 목록에서 확인하고 삭제할 수 있습니다. */}
                                                {product.statusNo !== 1 && (
                                                    <span className="my-wishlist__unavailable">현재 구매 불가</span>
                                                )}

                                                <div className="my-wishlist__price">
                                                    {onSale && <del>₩{product.price.toLocaleString('ko-KR')}</del>}
                                                    <div>
                                                        <strong>
                                                            ₩{(onSale ? product.salePrice : product.price).toLocaleString('ko-KR')}
                                                        </strong>
                                                        {onSale && <span>{product.discountRate}%</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </>
                    ) : !error && !notice ? (
                        <div className="my-wishlist__state">
                            <p>아직 찜한 상품이 없습니다.</p>
                            <Link className="my-wishlist__button" to="/products">상품 보러가기 ↗</Link>
                        </div>
                    ) : null}
                </>
            )}
        </main>
    );
}