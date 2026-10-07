import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cancelPendingOrder, getOrderDetail } from '../../api/orderApi';
import { useAuth } from '../../context/AuthContext';
import type { OrderResponse } from '../../ts/order';
import './OrderDetailPage.css';
import { openTossPayment } from '../../ts/tossPayment';
import { applyBankPayment, getPaymentByOrder } from '../../api/paymentApi';
import type { PaymentResponse } from '../../ts/payment';

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
    const [paymentMethod, setPaymentMethod] = useState<'TOSS' | 'BANK'>('TOSS');
    const [depositor, setDepositor] = useState('');
    const [bankPayment, setBankPayment] = useState<PaymentResponse | null>(null);

    // 주소의 주문번호로 DB에 저장된 주문을 조회합니다.
    useEffect(() => {
        let cancelled = false;
        setOrder(null);
        setError('');
        setCancelError('');

        // 다른 주문의 결제수단·입금정보가 남지 않도록 초기화합니다.
        setBankPayment(null);
        setPaymentMethod('TOSS');
        setDepositor('');

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

                // 본인 주문인지 확인한 다음 해당 주문의 결제정보를 조회합니다.
                // 서버의 조회 권한 검증은 인증 기능 구현 시 함께 적용해야 합니다.
                if (result.mno !== currentMemberNo) {
                    throw new Error('본인의 주문만 조회할 수 있습니다.');
                }

                const payment = await getPaymentByOrder(no);
                if (cancelled) return;

                // 다른 주문의 응답이 표시되지 않도록 주문번호를 확인합니다.
                if (payment && payment.ordno !== no) {
                    throw new Error('주문의 결제정보가 일치하지 않습니다.');
                }

                // 무통장입금 대기 상태이면 신청 정보를 복원하고 재신청 버튼을 숨깁니다.
                if (payment?.method === 'BANK' && payment.statusNo === 0) {
                    setBankPayment(payment);
                    setPaymentMethod('BANK');
                    setDepositor(payment.depositor ?? '');
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

    // 무통장입금을 신청합니다. 신청 성공은 입금 대기이며 결제 완료가 아닙니다.
    const handleBankPayment = async () => {
        if (!order || memberNo === undefined || order.statusNo !== 1 || paymentOpeningRef.current || cancellingRef.current) return;

        const depositorName = depositor.trim();
        if (!depositorName) {
            setCancelError('입금자명을 입력해주세요.');
            return;
        }

        // Toss 결제·주문 취소와 동시에 실행되지 않도록 기존 잠금 상태를 공유합니다.
        paymentOpeningRef.current = true;
        setPaymentLoading(true);
        setCancelError('');

        try {
            const result = await applyBankPayment({
                mno: memberNo,
                ordno: order.no,
                depositor: depositorName,
            });

            // 서버에서 해당 주문의 무통장입금 대기 정보가 반환됐는지 확인합니다.
            if (result.ordno !== order.no || result.method !== 'BANK' || result.statusNo !== 0) {
                throw new Error('무통장입금 신청 결과를 확인해주세요.');
            }

            setBankPayment(result);
        } catch (err) {
            setCancelError(err instanceof Error ? err.message : '무통장입금 신청에 실패했습니다.');
        } finally {
            paymentOpeningRef.current = false;
            setPaymentLoading(false);
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

                {/* 결제 대기 주문에서 결제수단을 선택합니다. 신청 후에는 입금 대기 정보를 표시합니다. */}
                {order.statusNo === 1 && (
                    <section className="order-detail-section">
                        <h2>결제수단</h2>

                        {bankPayment ? (
                            <div className="order-detail-bank-notice" role="status">
                                <strong>무통장입금 신청이 완료되었습니다.</strong>
                                <p>입금자명: {bankPayment.depositor}</p>
                                <p>입금 예정 금액: {bankPayment.amount.toLocaleString('ko-KR')}원</p>
                                <p>현재 입금 대기 상태입니다. 관리자 입금 확인 후 결제 완료로 변경됩니다.</p>
                                {/* 개인 프로젝트에서는 실제 송금 없이 관리자 확인 기능으로 테스트합니다. */}
                                <p>테스트용 신청입니다. 실제 송금하지 마세요.</p>
                            </div>
                        ) : (
                            <>
                                <div className="order-detail-payment-methods">
                                    <button type="button" className={paymentMethod === 'TOSS' ? 'active' : ''} aria-pressed={paymentMethod === 'TOSS'} disabled={paymentLoading || cancelLoading} onClick={() => { setPaymentMethod('TOSS'); setCancelError(''); }}>
                                        카드 / 간편결제
                                    </button>
                                    <button type="button" className={paymentMethod === 'BANK' ? 'active' : ''} aria-pressed={paymentMethod === 'BANK'} disabled={paymentLoading || cancelLoading} onClick={() => { setPaymentMethod('BANK'); setCancelError(''); }}>
                                        무통장입금
                                    </button>
                                </div>

                                {paymentMethod === 'BANK' && (
                                    <div className="order-detail-bank-form">
                                        <label htmlFor="bank-depositor">입금자명</label>
                                        <input id="bank-depositor" type="text" value={depositor} maxLength={50} placeholder="입금자명을 입력해주세요." disabled={paymentLoading || cancelLoading} onChange={event => setDepositor(event.target.value)} />
                                        <p>신청 후 관리자 입금 확인 전까지 입금 대기 상태로 유지됩니다.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                )}

                <div className="order-detail-actions">
                    <Link to="/products">쇼핑 계속하기</Link>

                    {order.statusNo === 1 && (
                        <>
                            {/* 무통장입금 신청 후에는 결제 신청 버튼을 숨겨 중복 진행을 방지합니다. */}
                            {!bankPayment && (
                                <button type="button" className="order-detail-pay" disabled={paymentLoading || cancelLoading} onClick={paymentMethod === 'BANK' ? handleBankPayment : handlePayment}>
                                    {paymentLoading ? '처리 중...' : paymentMethod === 'BANK' ? '무통장입금 신청' : '결제하기'}
                                </button>
                            )}
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