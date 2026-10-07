import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cancelPendingOrder, getOrderDetail } from '../../api/orderApi';
import { useAuth } from '../../context/AuthContext';
import type { OrderResponse } from '../../ts/order';
import './OrderDetailPage.css';
import { openTossPayment } from '../../ts/tossPayment';

// 주문 상태값에 맞는 안내 문구를 표시합니다.
const ORDER_STATUS: Record<number, string> = {
    0: '주문 취소',
    1: '결제 대기',
    2: '결제 완료',
    3: '상품 준비',
    4: '배송 중',
    5: '배송 완료',
};

export default function OrderDetailPage() {
    const { orderNo } = useParams();
    const { member } = useAuth();
    const memberNo = member?.no;
    const [order, setOrder] = useState<OrderResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cancelLoading, setCancelLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false); // 결제창 호출 중 중복 클릭 방지
    const paymentOpeningRef = useRef(false);
    const [cancelError, setCancelError] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const cancellingRef = useRef(false);

    // 주소의 주문번호로 DB에 저장된 주문을 조회합니다.
    useEffect(() => {
        let cancelled = false;
        setOrder(null);
        setError('');
        setCancelError('');

        if (memberNo === undefined) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const currentMemberNo = memberNo;

        async function loadOrder() {
            try {
                const no = Number(orderNo);
                if (!orderNo || !Number.isSafeInteger(no) || no <= 0) {
                    throw new Error('잘못된 주문번호입니다.');
                }

                const result = await getOrderDetail(no);
                if (cancelled) return;

                // 화면에서는 로그인 회원 본인의 주문만 표시합니다.
                // 서버의 주문 조회 권한 검증도 인증 기능 구현 시 함께 적용해야 합니다.
                if (result.mno !== currentMemberNo) {
                    throw new Error('본인의 주문만 조회할 수 있습니다.');
                }
                setOrder(result);
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : '주문 정보를 불러오지 못했습니다.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadOrder();
        return () => { cancelled = true; };
    }, [orderNo, memberNo, retryCount]);

    // 결제 대기 주문만 취소합니다. 재고 복구는 서버에서 처리합니다.
    const handleCancel = async () => {
        if (!order || memberNo === undefined || order.statusNo !== 1 || cancellingRef.current || paymentOpeningRef.current) return;
        if (!window.confirm('주문을 취소하시겠습니까?')) return;

        cancellingRef.current = true;
        setCancelLoading(true);
        setCancelError('');

        try {
            const result = await cancelPendingOrder(order.no, memberNo);
            setOrder(result);
        } catch (err) {
            setCancelError(err instanceof Error ? err.message : '주문 취소에 실패했습니다.');
        } finally {
            cancellingRef.current = false;
            setCancelLoading(false);
        }
    };

    // 최신 주문 상태를 다시 조회한 뒤 Toss 결제창을 엽니다.
    const handlePayment = async () => {
        if (!order || memberNo === undefined || paymentOpeningRef.current || cancellingRef.current) return;

        paymentOpeningRef.current = true;
        setPaymentLoading(true);
        setCancelError('');

        try {
            const latestOrder = await getOrderDetail(order.no);
            if (latestOrder.mno !== memberNo) throw new Error('본인의 주문만 결제할 수 있습니다.');

            setOrder(latestOrder);
            await openTossPayment(latestOrder, memberNo);
        } catch (err) {
            // 결제창 중단이나 통신 오류만으로 주문을 자동 취소하지 않습니다.
            setCancelError(err instanceof Error ? err.message : '결제창을 열지 못했거나 결제가 중단되었습니다. 주문 상태를 확인해주세요.');
        } finally {
            setPaymentLoading(false);
            paymentOpeningRef.current = false;
        }
    };

    if (!member) {
        return <main className="order-detail-page"><div className="order-detail-state"><p>로그인 후 주문을 확인해주세요.</p><Link to="/login">로그인</Link></div></main>;
    }
    if (loading) {
        return <main className="order-detail-page"><div className="order-detail-state" role="status">주문 정보를 불러오는 중입니다.</div></main>;
    }
    if (error || !order) {
        return (
            <main className="order-detail-page">
                <div className="order-detail-state" role="alert">
                    <p>{error || '주문 정보가 없습니다.'}</p>
                    <button type="button" onClick={() => setRetryCount(count => count + 1)}>다시 조회</button>
                    <Link to="/products">상품 보러 가기</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="order-detail-page">
            <div className="order-detail-container">
                <header className="order-detail-heading">
                    <h1>ORDER DETAIL</h1>
                    <p>주문번호 {order.no}</p>
                </header>

                {/* 새로고침해도 서버에 저장된 현재 주문 상태를 표시합니다. */}
                <section className="order-detail-status">
                    <span>주문 상태</span>
                    <strong>{ORDER_STATUS[order.statusNo] ?? '상태 확인 필요'}</strong>
                </section>

                {/* 상품이 변경돼도 주문 당시 상품명·옵션·단가를 표시합니다. */}
                <section className="order-detail-section">
                    <h2>주문 상품</h2>
                    <div className="order-detail-items">
                        {order.items.map(item => (
                            <article className="order-detail-item" key={item.no}>
                                <div>
                                    <h3>{item.productName}</h3>
                                    <p>COLOR: {item.color || '-'} / SIZE: {item.sizeValue || '-'}</p>
                                    <p>수량 {item.qty}개</p>
                                </div>
                                <strong>{(item.price * item.qty).toLocaleString('ko-KR')}원</strong>
                            </article>
                        ))}
                    </div>
                </section>

                {/* totalPrice는 상품 합계와 배송비를 포함한 주문 금액입니다. */}
                <section className="order-detail-section">
                    <h2>주문 금액</h2>
                    <div className="order-detail-price-row"><span>상품 금액</span><span>{(order.totalPrice - order.shippingFee).toLocaleString('ko-KR')}원</span></div>
                    <div className="order-detail-price-row"><span>배송비</span><span>{order.shippingFee === 0 ? '무료' : `${order.shippingFee.toLocaleString('ko-KR')}원`}</span></div>
                    <div className="order-detail-total"><span>총 주문 금액</span><strong>{order.totalPrice.toLocaleString('ko-KR')}원</strong></div>
                </section>

                {cancelError && <p className="order-detail-error" role="alert">{cancelError}</p>}
                {order.statusNo === 0 && <p className="order-detail-notice" role="status">취소된 주문입니다.</p>}

                <div className="order-detail-actions">
                    <Link to="/products">쇼핑 계속하기</Link>

                    {/* 결제 대기 주문에서만 결제·취소 버튼을 표시합니다. */}
                    {order.statusNo === 1 && (
                        <>
                            <button type="button" className="order-detail-pay" disabled={paymentLoading || cancelLoading} onClick={handlePayment}>
                                {paymentLoading ? '결제창 연결 중...' : '결제하기'}
                            </button>
                            <button type="button" disabled={paymentLoading || cancelLoading} onClick={handleCancel}>
                                {cancelLoading ? '취소 처리 중...' : '주문 취소'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}