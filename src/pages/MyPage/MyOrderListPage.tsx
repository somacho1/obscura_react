import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getOrdersByMember } from '../../api/orderApi';
import type { OrderResponse } from '../../ts/order';
import './MyOrderListPage.css';

const ORDER_STATUS: Record<number, string> = {
    0: '주문 취소', 1: '결제 대기', 2: '결제 완료',
    3: '상품 준비', 4: '배송 중', 5: '배송 완료',
};

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
    });
}

// 첫 상품명과 나머지 주문 항목 수를 표시합니다.
function getOrderName(order: OrderResponse): string {
    const first = order.items[0];
    if (!first) return '주문 상품 정보 없음';
    return order.items.length > 1
        ? `${first.productName} 외 ${order.items.length - 1}건`
        : first.productName;
}

export default function MyOrderListPage() {
    const { member } = useAuth();
    const memberNo = member?.no;
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    // 로그인 회원의 주문 내역을 조회합니다.
    useEffect(() => {
        let cancelled = false;
        setOrders([]);
        setError('');
        setLoading(true);

        if (!memberNo) {
            setLoading(false);
            return () => { cancelled = true; };
        }

        async function loadOrders() {
            try {
                const data = await getOrdersByMember(memberNo!);
                if (cancelled) return;

                // 다른 회원의 주문이 섞인 응답은 표시하지 않습니다.
                if (data.some(order => order.mno !== memberNo)) {
                    throw new Error('주문 회원정보가 일치하지 않습니다.');
                }
                setOrders(data);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : '주문 내역을 불러오지 못했습니다.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadOrders();
        return () => { cancelled = true; };
    }, [memberNo, retryCount]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    if (!member) {
        return (
            <main className="my-order-list">
                <div className="my-order-list__state">
                    <p>로그인 후 주문 내역을 확인해주세요.</p>
                    <Link className="my-order-list__button" to="/login">로그인</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="my-order-list">
            <header className="my-order-list__heading">
                <div>
                    <p>MY ORDERS</p>
                    <h1>주문 내역</h1>
                </div>
                <Link className="my-order-list__button" to="/mypage">마이페이지</Link>
            </header>

            {loading ? (
                <div className="my-order-list__state" role="status">주문 내역을 불러오는 중입니다.</div>
            ) : error ? (
                <div className="my-order-list__state" role="alert">
                    <p>{error}</p>
                    <button
                        type="button"
                        className="my-order-list__button"
                        onClick={() => setRetryCount(count => count + 1)}
                    >
                        다시 조회
                    </button>
                </div>
            ) : orders.length === 0 ? (
                <div className="my-order-list__state">
                    <p>아직 주문 내역이 없습니다.</p>
                    <Link className="my-order-list__button" to="/products">쇼핑하러 가기</Link>
                </div>
            ) : (
                <div className="my-order-list__items">
                    {orders.map(order => (
                        <article className="my-order-list__item" key={order.no}>
                            <div className="my-order-list__item-heading">
                                <div>
                                    <span>{formatDate(order.cdate)}</span>
                                    <span>주문번호 {order.no}</span>
                                </div>
                                <strong>{ORDER_STATUS[order.statusNo] ?? '확인 필요'}</strong>
                            </div>
                            <div className="my-order-list__item-body">
                                <div className="my-order-list__product">
                                    <h2>{getOrderName(order)}</h2>
                                    <p>총 주문 수량 {order.items.reduce((sum, item) => sum + item.qty, 0)}개</p>
                                </div>
                                <div className="my-order-list__amount">
                                    <span>주문 금액</span>
                                    <strong>{order.totalPrice.toLocaleString('ko-KR')}원</strong>
                                </div>
                                <Link
                                    className="my-order-list__button"
                                    to={`/orders/${order.no}`}
                                    aria-label={`주문 ${order.no} 상세보기`}
                                >
                                    상세보기 →
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
}