import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteCartItem, getCartItems, updateCartItemQty } from '../../api/cartApi';
import { useAuth } from '../../context/AuthContext';
import type { CartItemDetailResponse } from '../../ts/cart';
import { getImageUrl } from '../../ts/imageUrl';
import './CartPage.css';

// 배송 정책: 선택 상품 합계가 6만원 이상이면 무료배송입니다.
const SHIPPING_FEE = 3500;
const FREE_SHIPPING_MIN = 60000;

function canOrder(item: CartItemDetailResponse) {
    return !item.soldOut && item.qty > 0 && item.qty <= item.stockQty;
}

export default function CartPage() {
    const { member } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState<CartItemDetailResponse[]>([]);
    const [selectedNos, setSelectedNos] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingItemNo, setUpdatingItemNo] = useState<number | null>(null);
    const [deletingItemNo, setDeletingItemNo] = useState<number | null>(null);

    // 변경 요청 중에는 다른 변경·주문을 막아 화면 수량과 서버 수량이 어긋나지 않게 합니다.
    const busy = updatingItemNo !== null || deletingItemNo !== null;

    // 장바구니 조회: 주문 가능한 상품을 기본 선택합니다.
    const loadCartItems = useCallback(async () => {
        if (!member) {
            setItems([]);
            setSelectedNos([]);
            setError('');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');
            const data = await getCartItems(member.no);
            setItems(data);
            setSelectedNos(data.filter(canOrder).map(item => item.cartItemNo));
        } catch (err) {
            setItems([]);
            setSelectedNos([]);
            setError(err instanceof Error ? err.message : '장바구니를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [member]);

    useEffect(() => {
        void loadCartItems();
    }, [loadCartItems]);

    // 주문 가능한 상품과 실제 선택 상품을 구분합니다.
    const availableItems = useMemo(() => items.filter(canOrder), [items]);
    const selectedItems = useMemo(
        () => availableItems.filter(item => selectedNos.includes(item.cartItemNo)),
        [availableItems, selectedNos]
    );
    const allSelected = availableItems.length > 0 && selectedItems.length === availableItems.length;

    // 상품이 선택되지 않았으면 배송비도 0원으로 표시합니다.
    const totalPrice = useMemo(
        () => selectedItems.reduce((total, item) => total + item.salePrice * item.qty, 0),
        [selectedItems]
    );
    const shippingFee = selectedItems.length === 0 || totalPrice >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
    const paymentPrice = totalPrice + shippingFee;

    // 전체 선택·해제: 품절·재고 부족 상품은 제외합니다.
    const handleSelectAll = () => {
        if (busy) return;
        setSelectedNos(allSelected ? [] : availableItems.map(item => item.cartItemNo));
    };

    // 개별 선택·해제
    const handleSelectItem = (item: CartItemDetailResponse) => {
        if (busy || !canOrder(item)) return;
        setSelectedNos(current => current.includes(item.cartItemNo)
            ? current.filter(no => no !== item.cartItemNo)
            : [...current, item.cartItemNo]);
    };

    // 서버 수량 변경이 성공한 뒤 화면에 반영합니다.
    const handleQtyChange = async (item: CartItemDetailResponse, nextQty: number) => {
        if (busy || nextQty < 1) return;
        if (item.soldOut) { alert('품절된 상품입니다.'); return; }
        if (nextQty > item.stockQty) {
            alert(`현재 재고는 ${item.stockQty}개입니다.`);
            return;
        }

        try {
            setUpdatingItemNo(item.cartItemNo);
            await updateCartItemQty(item.cartItemNo, nextQty);
            setItems(current => current.map(currentItem =>
                currentItem.cartItemNo === item.cartItemNo ? { ...currentItem, qty: nextQty } : currentItem
            ));
        } catch (err) {
            alert(err instanceof Error ? err.message : '수량 변경에 실패했습니다.');
        } finally {
            setUpdatingItemNo(null);
        }
    };

    // 확인 후 삭제하고 상품 목록·선택 목록·Header 개수를 갱신합니다.
    const handleDelete = async (cartItemNo: number) => {
        if (busy || !window.confirm('장바구니에서 삭제하시겠습니까?')) return;

        try {
            setDeletingItemNo(cartItemNo);
            await deleteCartItem(cartItemNo);

            setItems(current => current.filter(item => item.cartItemNo !== cartItemNo));
            setSelectedNos(current => current.filter(no => no !== cartItemNo));

            // 삭제 성공 후 Header에 장바구니 개수 갱신을 알립니다.
            window.dispatchEvent(new Event('cart-updated'));
        } catch (err) {
            alert(err instanceof Error ? err.message : '상품 삭제에 실패했습니다.');
        } finally {
            setDeletingItemNo(null);
        }
    };

    // 가격 대신 선택한 장바구니 항목 번호만 전달합니다.
    // 주문서에서 서버 데이터를 다시 조회하며 이 단계에서는 주문을 생성하지 않습니다.
    const handleCheckout = () => {
        if (busy) return;
        if (selectedItems.length === 0) { alert('주문할 상품을 선택해주세요.'); return; }

        const query = new URLSearchParams({
            cartItemNos: selectedItems.map(item => item.cartItemNo).join(','),
        });
        navigate(`/order?${query.toString()}`);
    };
    
    // 모든 Hook은 아래 조건부 반환보다 위에서 실행합니다.
    if (loading) {
        return <main className="cart-page"><div className="cart-message" role="status">장바구니를 불러오는 중입니다.</div></main>;
    }

    if (!member) {
        return (
            <main className="cart-page">
                <div className="cart-message">
                    <p>로그인이 필요한 서비스입니다.</p>
                    <Link to="/login">LOGIN</Link>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="cart-page">
                <div className="cart-message" role="alert">
                    <p>{error}</p>
                    <button type="button" onClick={() => void loadCartItems()}>RETRY</button>
                </div>
            </main>
        );
    }

    return (
        <main className="cart-page">
            <div className="cart-container">
                <div className="cart-heading">
                    <h1>CART</h1>
                    <span>{items.length} ITEM{items.length !== 1 ? 'S' : ''}</span>
                </div>

                {items.length === 0 ? (
                    <div className="cart-empty">
                        <p>YOUR CART IS EMPTY.</p>
                        <Link to="/products">CONTINUE SHOPPING</Link>
                    </div>
                ) : (
                    <div className="cart-layout">
                        <section className="cart-list" aria-label="장바구니 상품">
                            {/* 전체 선택과 현재 선택 개수 */}
                            <div className="cart-selection-bar">
                                <label>
                                    <input type="checkbox" checked={allSelected} disabled={availableItems.length === 0 || busy} onChange={handleSelectAll} />
                                    <span>전체 선택</span>
                                </label>
                                <span>{selectedItems.length} / {items.length}개 선택</span>
                            </div>

                            {items.map(item => (
                                <article className="cart-item" key={item.cartItemNo}>
                                    {/* 개별 선택 */}
                                    <label className="cart-item-select">
                                        <input type="checkbox" checked={canOrder(item) && selectedNos.includes(item.cartItemNo)} disabled={!canOrder(item) || busy} onChange={() => handleSelectItem(item)} />
                                        <span className="cart-selection-sr-only">{item.productName} {item.color} {item.sizeValue} 주문 선택</span>
                                    </label>

                                    {/* 대표 이미지: 기존 공통 URL 변환 함수를 사용합니다. */}
                                    <Link className="cart-item-image" to={`/products/${item.productNo}`}>
                                        {item.mainImageUrl ? (
                                            <img src={getImageUrl(item.mainImageUrl)} alt={item.productName} />
                                        ) : (
                                            <div className="cart-image-empty">NO IMAGE</div>
                                        )}
                                    </Link>

                                    <div className="cart-item-info">
                                        <div>
                                            <p className="cart-brand">{item.brandName}</p>
                                            <Link className="cart-product-name" to={`/products/${item.productNo}`}>{item.productName}</Link>
                                            <p className="cart-option">COLOR: {item.color || '-'} / SIZE: {item.sizeValue || '-'}</p>
                                            {item.soldOut ? (
                                                <p className="cart-soldout">SOLD OUT</p>
                                            ) : item.qty > item.stockQty ? (
                                                <p className="cart-soldout">재고 부족 — 수량을 줄여주세요. 현재 {item.stockQty}개</p>
                                            ) : null}
                                        </div>

                                        {/* 수량 변경과 개별 삭제 */}
                                        <div className="cart-item-bottom">
                                            <div className="cart-qty">
                                                <button type="button" aria-label={`${item.productName} 수량 줄이기`} disabled={busy || item.qty <= 1 || item.soldOut} onClick={() => void handleQtyChange(item, item.qty - 1)}>−</button>
                                                <span>{item.qty}</span>
                                                <button type="button" aria-label={`${item.productName} 수량 늘리기`} disabled={busy || item.qty >= item.stockQty || item.soldOut} onClick={() => void handleQtyChange(item, item.qty + 1)}>+</button>
                                            </div>
                                            <button type="button" className="cart-delete" disabled={busy} onClick={() => void handleDelete(item.cartItemNo)}>
                                                {deletingItemNo === item.cartItemNo ? 'REMOVING...' : 'REMOVE'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* 상품별 금액: 할인 전·후 모두 해당 수량 기준으로 표시합니다. */}
                                    <div className="cart-item-price">
                                        {item.discountRate > 0 && <span className="cart-original-price">{(item.price * item.qty).toLocaleString('ko-KR')}원</span>}
                                        <strong>{(item.salePrice * item.qty).toLocaleString('ko-KR')}원</strong>
                                        {item.discountRate > 0 && <span className="cart-discount">{item.discountRate}% OFF</span>}
                                    </div>
                                </article>
                            ))}
                        </section>

                        {/* 선택한 상품 기준 예상 주문 금액 */}
                        <aside className="cart-summary">
                            <h2>ORDER SUMMARY</h2>
                            <div className="cart-summary-row">
                                <span>PRODUCT ({selectedItems.length})</span>
                                <span>{totalPrice.toLocaleString('ko-KR')}원</span>
                            </div>
                            <div className="cart-summary-row">
                                <span>SHIPPING</span>
                                <span>{selectedItems.length === 0 ? '—' : shippingFee === 0 ? 'FREE' : `${shippingFee.toLocaleString('ko-KR')}원`}</span>
                            </div>
                            <p className="cart-shipping-note">60,000원 이상 구매 시 무료배송</p>
                            <div className="cart-summary-total">
                                <span>TOTAL</span>
                                <strong>{paymentPrice.toLocaleString('ko-KR')}원</strong>
                            </div>
                            <button type="button" className="cart-checkout" disabled={selectedItems.length === 0 || busy} onClick={handleCheckout}>
                                CHECKOUT ({selectedItems.length})
                            </button>
                            <Link className="cart-continue" to="/products">CONTINUE SHOPPING</Link>
                        </aside>
                    </div>
                )}
            </div>
        </main>
    );
}