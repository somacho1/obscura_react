import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { Link } from 'react-router-dom';

import {
    deleteCartItem,
    getCartItems,
    updateCartItemQty,
} from '../../api/cartApi';

import { useAuth } from '../../context/AuthContext';

import type {
    CartItemDetailResponse,
} from '../../ts/cart';

import './CartPage.css';

function CartPage() {
    // 현재 로그인한 회원정보
    const { member } = useAuth();

    const [items, setItems] = useState<
        CartItemDetailResponse[]
    >([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    // 수량 변경 중인 CARTITEM 번호
    const [updatingItemNo, setUpdatingItemNo] =
        useState<number | null>(null);

    /**
     * 장바구니 조회
     */
    const loadCartItems = useCallback(
        async () => {
            // 로그인하지 않은 경우
            if (!member) {
                setItems([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError('');

                // 로그인한 회원번호로 장바구니 조회
                const data = await getCartItems(
                    member.no,
                );

                setItems(data);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : '장바구니를 불러오지 못했습니다.',
                );
            } finally {
                setLoading(false);
            }
        },
        [member],
    );

    /**
     * 페이지 진입 또는 로그인 회원 변경 시
     * 장바구니 다시 조회
     */
    useEffect(() => {
        loadCartItems();
    }, [loadCartItems]);

    /**
     * 수량 변경
     */
    const handleQtyChange = async (
        item: CartItemDetailResponse,
        nextQty: number,
    ) => {
        if (nextQty < 1) {
            return;
        }

        if (nextQty > item.stockQty) {
            alert(
                `현재 재고는 ${item.stockQty}개입니다.`,
            );
            return;
        }

        try {
            setUpdatingItemNo(
                item.cartItemNo,
            );

            await updateCartItemQty(
                item.cartItemNo,
                nextQty,
            );

            // 서버 변경 성공 후 화면에도 반영
            setItems((currentItems) =>
                currentItems.map(
                    (currentItem) =>
                        currentItem.cartItemNo ===
                            item.cartItemNo
                            ? {
                                ...currentItem,
                                qty: nextQty,
                            }
                            : currentItem,
                ),
            );
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : '수량 변경에 실패했습니다.',
            );
        } finally {
            setUpdatingItemNo(null);
        }
    };

    /**
     * 상품 삭제
     */
    const handleDelete = async (
        cartItemNo: number,
    ) => {
        const confirmed =
            window.confirm(
                '장바구니에서 삭제하시겠습니까?',
            );

        if (!confirmed) {
            return;
        }

        try {
            await deleteCartItem(
                cartItemNo,
            );

            setItems((currentItems) =>
                currentItems.filter(
                    (item) =>
                        item.cartItemNo !==
                        cartItemNo,
                ),
            );
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : '상품 삭제에 실패했습니다.',
            );
        }
    };

    /**
     * 상품 총 금액
     */
    const totalPrice = useMemo(
        () =>
            items.reduce(
                (total, item) =>
                    total +
                    item.salePrice *
                    item.qty,
                0,
            ),
        [items],
    );

    /**
     * 로딩 중
     */
    if (loading) {
        return (
            <main className="cart-page">
                <div className="cart-message">
                    Loading...
                </div>
            </main>
        );
    }

    /**
     * 로그인하지 않은 경우
     */
    if (!member) {
        return (
            <main className="cart-page">
                <div className="cart-message">
                    <p>
                        로그인이 필요한 서비스입니다.
                    </p>

                    <Link to="/login">
                        LOGIN
                    </Link>
                </div>
            </main>
        );
    }

    /**
     * 장바구니 조회 실패
     */
    if (error) {
        return (
            <main className="cart-page">
                <div className="cart-message">
                    <p>{error}</p>

                    <button
                        type="button"
                        onClick={loadCartItems}
                    >
                        RETRY
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="cart-page">
            <div className="cart-container">
                <div className="cart-heading">
                    <h1>CART</h1>

                    <span>
                        {items.length} ITEM
                        {items.length !== 1
                            ? 'S'
                            : ''}
                    </span>
                </div>

                {items.length === 0 ? (
                    <div className="cart-empty">
                        <p>
                            YOUR CART IS EMPTY.
                        </p>

                        <Link to="/">
                            CONTINUE SHOPPING
                        </Link>
                    </div>
                ) : (
                    <div className="cart-layout">
                        <section className="cart-list">
                            {items.map(
                                (item) => (
                                    <article
                                        className="cart-item"
                                        key={
                                            item.cartItemNo
                                        }
                                    >
                                        <Link
                                            className="cart-item-image"
                                            to={`/products/${item.productNo}`}
                                        >
                                            {item.mainImageUrl ? (
                                                <img
                                                    src={
                                                        item.mainImageUrl
                                                    }
                                                    alt={
                                                        item.productName
                                                    }
                                                />
                                            ) : (
                                                <div className="cart-image-empty">
                                                    NO IMAGE
                                                </div>
                                            )}
                                        </Link>

                                        <div className="cart-item-info">
                                            <div>
                                                <p className="cart-brand">
                                                    {
                                                        item.brandName
                                                    }
                                                </p>

                                                <Link
                                                    className="cart-product-name"
                                                    to={`/products/${item.productNo}`}
                                                >
                                                    {
                                                        item.productName
                                                    }
                                                </Link>

                                                <p className="cart-option">
                                                    COLOR:{' '}
                                                    {item.color ||
                                                        '-'}
                                                    {' / '}
                                                    SIZE:{' '}
                                                    {item.sizeValue ||
                                                        '-'}
                                                </p>

                                                {item.soldOut && (
                                                    <p className="cart-soldout">
                                                        SOLD OUT
                                                    </p>
                                                )}
                                            </div>

                                            <div className="cart-item-bottom">
                                                <div className="cart-qty">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            updatingItemNo ===
                                                            item.cartItemNo ||
                                                            item.qty <=
                                                            1
                                                        }
                                                        onClick={() =>
                                                            handleQtyChange(
                                                                item,
                                                                item.qty -
                                                                1,
                                                            )
                                                        }
                                                    >
                                                        −
                                                    </button>

                                                    <span>
                                                        {
                                                            item.qty
                                                        }
                                                    </span>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            updatingItemNo ===
                                                            item.cartItemNo ||
                                                            item.qty >=
                                                            item.stockQty ||
                                                            item.soldOut
                                                        }
                                                        onClick={() =>
                                                            handleQtyChange(
                                                                item,
                                                                item.qty +
                                                                1,
                                                            )
                                                        }
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="cart-delete"
                                                    onClick={() =>
                                                        handleDelete(
                                                            item.cartItemNo,
                                                        )
                                                    }
                                                >
                                                    REMOVE
                                                </button>
                                            </div>
                                        </div>

                                        <div className="cart-item-price">
                                            {item.discountRate >
                                                0 && (
                                                    <span className="cart-original-price">
                                                        {item.price.toLocaleString()}
                                                        원
                                                    </span>
                                                )}

                                            <strong>
                                                {(
                                                    item.salePrice *
                                                    item.qty
                                                ).toLocaleString()}
                                                원
                                            </strong>

                                            {item.discountRate >
                                                0 && (
                                                    <span className="cart-discount">
                                                        {
                                                            item.discountRate
                                                        }
                                                        % OFF
                                                    </span>
                                                )}
                                        </div>
                                    </article>
                                ),
                            )}
                        </section>

                        <aside className="cart-summary">
                            <h2>
                                ORDER SUMMARY
                            </h2>

                            <div className="cart-summary-row">
                                <span>
                                    PRODUCT
                                </span>

                                <span>
                                    {totalPrice.toLocaleString()}
                                    원
                                </span>
                            </div>

                            <div className="cart-summary-row">
                                <span>
                                    SHIPPING
                                </span>

                                <span>
                                    FREE
                                </span>
                            </div>

                            <div className="cart-summary-total">
                                <span>
                                    TOTAL
                                </span>

                                <strong>
                                    {totalPrice.toLocaleString()}
                                    원
                                </strong>
                            </div>

                            <button
                                type="button"
                                className="cart-checkout"
                                onClick={() =>
                                    alert(
                                        '주문 기능은 다음 단계에서 연결합니다.',
                                    )
                                }
                            >
                                CHECKOUT
                            </button>

                            <Link
                                className="cart-continue"
                                to="/"
                            >
                                CONTINUE SHOPPING
                            </Link>
                        </aside>
                    </div>
                )}
            </div>
        </main>
    );
}

export default CartPage;