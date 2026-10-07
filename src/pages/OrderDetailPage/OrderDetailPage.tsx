import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cancelPendingOrder, getOrderDetail } from '../../api/orderApi';
import {
    applyBankPayment,
    getPaymentByOrder,
    cancelTossPayment,
} from '../../api/paymentApi';
import { useAuth } from '../../context/AuthContext';
import { openTossPayment } from '../../ts/tossPayment';
import type { OrderResponse } from '../../ts/order';
import type { PaymentResponse } from '../../ts/payment';
import OrderDeliveryInfo from './OrderDeliveryInfo';
import './OrderDetailPage.css';
import BankRefundPanel from '../../components/payment/BankRefundPanel';

const ORDER_STATUS: Record<number, string> = {
    0: '주문 취소',
    1: '결제 대기',
    2: '결제 완료',
    3: '상품 준비',
    4: '배송 중',
    5: '배송 완료',
};

type ActionType = '' | 'PAYMENT' | 'CANCEL' | 'REFUND';

export default function OrderDetailPage() {
    const { orderNo } = useParams();
    const { member } = useAuth();
    const memberNo = member?.no;

    const [order, setOrder] = useState<OrderResponse | null>(null);
    const [paymentInfo, setPaymentInfo] = useState<PaymentResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'TOSS' | 'BANK'>('TOSS');
    const [depositor, setDepositor] = useState('');
    const [action, setAction] = useState<ActionType>('');

    // 모든 처리에서 같은 잠금을 사용해 중복 클릭을 방지합니다.
    const actionRef = useRef<ActionType>('');
    const versionRef = useRef(0);
    const busy = action !== '';

    const bankPayment = paymentInfo?.method === 'BANK'
        && paymentInfo.statusNo === 0 ? paymentInfo : null;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [orderNo]);

    // 주문과 결제정보를 조회하고, 다른 화면으로 이동하면 이전 응답을 무시합니다.
    useEffect(() => {
        const version = ++versionRef.current;
        let active = true;

        setOrder(null);
        setPaymentInfo(null);
        setError('');
        setActionError('');
        setPaymentMethod('TOSS');
        setDepositor('');
        setAction('');
        actionRef.current = '';

        if (memberNo === undefined) {
            setLoading(false);
            return;
        }

        const currentMemberNo = memberNo;
        setLoading(true);

        async function loadOrder() {
            try {
                const no = Number(orderNo);
                if (!orderNo || !Number.isSafeInteger(no) || no <= 0) {
                    throw new Error('잘못된 주문번호입니다.');
                }

                const result = await getOrderDetail(no);
                if (!active) return;

                if (result.no !== no || result.mno !== currentMemberNo) {
                    throw new Error('본인의 주문만 조회할 수 있습니다.');
                }

                const payment = await getPaymentByOrder(no);
                if (!active) return;

                if (payment && payment.ordno !== no) {
                    throw new Error('주문의 결제정보가 일치하지 않습니다.');
                }

                setOrder(result);
                setPaymentInfo(payment);

                if (payment?.method === 'BANK' && payment.statusNo === 0) {
                    setPaymentMethod('BANK');
                    setDepositor(payment.depositor ?? '');
                }
            } catch (err) {
                if (active) {
                    setError(err instanceof Error ? err.message : '주문 정보를 불러오지 못했습니다.');
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        void loadOrder();

        return () => {
            active = false;
            if (versionRef.current === version) versionRef.current += 1;
        };
    }, [orderNo, memberNo, retryCount]);

    function validateOrder(result: OrderResponse, no: number, mno: number) {
        if (result.no !== no || result.mno !== mno) {
            throw new Error('주문정보가 일치하지 않습니다.');
        }
    }

    function startAction(value: ActionType) {
        actionRef.current = value;
        setAction(value);
        setActionError('');
        return versionRef.current;
    }

    function finishAction(version: number) {
        if (version !== versionRef.current) return;
        actionRef.current = '';
        setAction('');
    }

    // 결제 대기 주문 취소: 서버에서 재고를 복구합니다.
    async function handleCancel() {
        if (!order || memberNo === undefined || order.statusNo !== 1 || actionRef.current) return;
        if (!window.confirm('주문을 취소하시겠습니까?')) return;

        const no = order.no;
        const mno = memberNo;
        const version = startAction('CANCEL');

        try {
            const result = await cancelPendingOrder(no, mno);
            if (version !== versionRef.current) return;

            validateOrder(result, no, mno);
            setOrder(result);
            setPaymentInfo((prev) => prev?.method === 'BANK'
                ? { ...prev, statusNo: 3 }
                : prev);
        } catch (err) {
            if (version === versionRef.current) {
                setActionError(err instanceof Error ? err.message : '주문 취소에 실패했습니다.');
            }
        } finally {
            finishAction(version);
        }
    }

    // 최신 주문·결제 상태를 확인한 다음 Toss 결제창을 엽니다.
    async function handlePayment() {
        if (!order || memberNo === undefined || order.statusNo !== 1 || actionRef.current) return;

        const no = order.no;
        const mno = memberNo;
        const version = startAction('PAYMENT');

        try {
            const latestOrder = await getOrderDetail(no);
            if (version !== versionRef.current) return;

            validateOrder(latestOrder, no, mno);
            setOrder(latestOrder);

            if (latestOrder.statusNo !== 1) {
                throw new Error('결제 대기 주문만 결제할 수 있습니다.');
            }

            const payment = await getPaymentByOrder(no);
            if (version !== versionRef.current) return;

            if (payment && payment.ordno !== no) {
                throw new Error('주문의 결제정보가 일치하지 않습니다.');
            }
            setPaymentInfo(payment);

            if (payment?.method === 'BANK') {
                throw new Error('무통장입금 신청 정보가 있습니다. 입금 상태를 확인해주세요.');
            }

            await openTossPayment(latestOrder, mno);
        } catch (err) {
            if (version === versionRef.current) {
                setActionError(err instanceof Error ? err.message : '결제창을 열지 못했습니다.');
            }
        } finally {
            finishAction(version);
        }
    }

    // 무통장입금 신청은 결제 완료가 아닌 입금 대기 상태입니다.
    async function handleBankPayment() {
        if (!order || memberNo === undefined || order.statusNo !== 1 || actionRef.current) return;

        const name = depositor.trim();
        if (!name || name.length > 50) {
            setActionError('입금자명을 1~50자로 입력해주세요.');
            return;
        }

        const no = order.no;
        const mno = memberNo;
        const version = startAction('PAYMENT');

        try {
            const result = await applyBankPayment({
                mno,
                ordno: no,
                depositor: name,
            });
            if (version !== versionRef.current) return;

            if (result.ordno !== no || result.method !== 'BANK' || result.statusNo !== 0) {
                throw new Error('무통장입금 신청 결과를 확인해주세요.');
            }

            setPaymentInfo(result);
            setDepositor(result.depositor ?? name);
        } catch (err) {
            if (version === versionRef.current) {
                setActionError(err instanceof Error ? err.message : '무통장입금 신청에 실패했습니다.');
            }
        } finally {
            finishAction(version);
        }
    }

    // 출고 전 Toss 전체 취소: 실제 취소·재고 복구는 서버에서 처리합니다.
    async function handleRefund() {
        if (
            !order || memberNo === undefined || actionRef.current
            || paymentInfo?.method !== 'TOSS'
            || paymentInfo.statusNo !== 1
            || ![2, 3].includes(order.statusNo)
            || ![0, 3].includes(order.cancelStatusNo)
        ) return;

        const retrying = order.cancelStatusNo === 3;
        let reason = '구매 의사 변경';

        if (retrying) {
            if (!window.confirm('기존 취소 요청의 결과를 다시 확인하시겠습니까?')) return;
        } else {
            const input = window.prompt('전체 주문 취소 사유를 입력해주세요.', reason);
            if (input === null) return;

            reason = input.trim();
            if (!reason || reason.length > 200) {
                setActionError('취소 사유는 1~200자로 입력해주세요.');
                return;
            }
        }

        const no = order.no;
        const mno = memberNo;
        const version = startAction('REFUND');

        try {
            // 재시도일 때는 서버가 처음 저장한 취소 사유를 사용합니다.
            const result = await cancelTossPayment(no, mno, reason);
            if (version !== versionRef.current) return;

            validateOrder(result, no, mno);
            if (result.statusNo !== 0 || result.cancelStatusNo !== 2) {
                throw new Error('전체 취소 결과를 다시 확인해주세요.');
            }

            setOrder(result);
            setPaymentInfo((prev) => prev ? { ...prev, statusNo: 3 } : prev);
        } catch (err) {
            if (version !== versionRef.current) return;

            setActionError(err instanceof Error ? err.message : '취소 결과를 확인하지 못했습니다.');

            // 통신 오류여도 취소 요청이 저장됐을 수 있으므로 주문을 다시 확인합니다.
            try {
                const latest = await getOrderDetail(no);
                if (version !== versionRef.current) return;

                validateOrder(latest, no, mno);
                setOrder(latest);

                if (latest.statusNo === 0 && latest.cancelStatusNo === 2) {
                    setPaymentInfo((prev) => prev ? { ...prev, statusNo: 3 } : prev);
                    setActionError('');
                }
            } catch {
                // 조회 실패 시 현재 화면과 오류 안내를 유지합니다.
            }
        } finally {
            finishAction(version);
        }
    }

    if (!member) {
        return (
            <main className="order-detail-page">
                <div className="order-detail-state">
                    <p>로그인 후 주문을 확인해주세요.</p>
                    <Link to="/login">로그인</Link>
                </div>
            </main>
        );
    }

    if (loading) {
        return (
            <main className="order-detail-page">
                <div className="order-detail-state" role="status">
                    주문 정보를 불러오는 중입니다.
                </div>
            </main>
        );
    }

    if (error || !order) {
        return (
            <main className="order-detail-page">
                <div className="order-detail-state" role="alert">
                    <p>{error || '주문 정보가 없습니다.'}</p>
                    <button type="button" onClick={() => setRetryCount((prev) => prev + 1)}>
                        다시 조회
                    </button>
                    <Link to="/mypage/orders">주문 목록</Link>
                </div>
            </main>
        );
    }

    const canRefund = paymentInfo?.method === 'TOSS'
        && paymentInfo.statusNo === 1
        && [2, 3].includes(order.statusNo)
        && [0, 3].includes(order.cancelStatusNo);

    return (
        <main className="order-detail-page">
            <div className="order-detail-container">
                <header className="order-detail-heading">
                    <h1>ORDER DETAIL</h1>
                    <p>주문번호 {order.no}</p>
                </header>

                <section className="order-detail-status">
                    <span>주문 상태</span>
                    <strong>
                        {order.cancelStatusNo === 3
                            ? '취소 처리 중 / 결과 확인 필요'
                            : ORDER_STATUS[order.statusNo] ?? '상태 확인 필요'}
                    </strong>
                </section>

                {/* 주문 당시 저장된 상품명·옵션·가격을 표시합니다. */}
                <section className="order-detail-section">
                    <h2>주문 상품</h2>
                    <div className="order-detail-items">
                        {order.items.map((item) => (
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

                <section className="order-detail-section">
                    <h2>주문 금액</h2>
                    <div className="order-detail-price-row">
                        <span>상품 금액</span>
                        <span>{(order.totalPrice - order.shippingFee).toLocaleString('ko-KR')}원</span>
                    </div>
                    <div className="order-detail-price-row">
                        <span>배송비</span>
                        <span>
                            {order.shippingFee === 0
                                ? '무료'
                                : `${order.shippingFee.toLocaleString('ko-KR')}원`}
                        </span>
                    </div>
                    <div className="order-detail-total">
                        <span>총 주문 금액</span>
                        <strong>{order.totalPrice.toLocaleString('ko-KR')}원</strong>
                    </div>
                </section>

                {/* 기존 배송정보와 배송조회 버튼을 유지합니다. */}
                <OrderDeliveryInfo key={order.no} orderNo={order.no} />

                {/* 입금 확인된 무통장 주문의 환불 요청 */}
                {paymentInfo?.method === 'BANK' && paymentInfo.statusNo !== 0 && (
                    <BankRefundPanel
                        key={`${order.no}-${memberNo}`}
                        orderNo={order.no}
                        memberNo={memberNo!}
                        disabled={busy}
                        onUpdated={() => setRetryCount((prev) => prev + 1)}
                    />
                )}

                {actionError && (
                    <p className="order-detail-error" role="alert">{actionError}</p>
                )}
                {order.statusNo === 0 && (
                    <p className="order-detail-notice" role="status">취소된 주문입니다.</p>
                )}
                {order.cancelStatusNo === 3 && (
                    <p className="order-detail-notice" role="status">
                        취소 결과 확인 전까지 출고가 보류됩니다. 결제 취소 재시도로 결과를 확인해주세요.
                    </p>
                )}

                {order.statusNo === 1 && (
                    <section className="order-detail-section">
                        <h2>결제수단</h2>

                        {bankPayment ? (
                            <div className="order-detail-bank-notice" role="status">
                                <strong>무통장입금 신청이 완료되었습니다.</strong>
                                <p>입금자명: {bankPayment.depositor}</p>
                                <p>입금 예정 금액: {bankPayment.amount.toLocaleString('ko-KR')}원</p>
                                <p>관리자 입금 확인 후 결제 완료로 변경됩니다.</p>
                                <p>테스트용 신청입니다. 실제 송금하지 마세요.</p>
                            </div>
                        ) : (
                            <>
                                <div className="order-detail-payment-methods">
                                    <button
                                        type="button"
                                        className={paymentMethod === 'TOSS' ? 'active' : ''}
                                        aria-pressed={paymentMethod === 'TOSS'}
                                        disabled={busy}
                                        onClick={() => {
                                            setPaymentMethod('TOSS');
                                            setActionError('');
                                        }}
                                    >
                                        카드 / 간편결제
                                    </button>
                                    <button
                                        type="button"
                                        className={paymentMethod === 'BANK' ? 'active' : ''}
                                        aria-pressed={paymentMethod === 'BANK'}
                                        disabled={busy}
                                        onClick={() => {
                                            setPaymentMethod('BANK');
                                            setActionError('');
                                        }}
                                    >
                                        무통장입금
                                    </button>
                                </div>

                                {paymentMethod === 'BANK' && (
                                    <div className="order-detail-bank-form">
                                        <label htmlFor="bank-depositor">입금자명</label>
                                        <input
                                            id="bank-depositor"
                                            type="text"
                                            value={depositor}
                                            maxLength={50}
                                            placeholder="입금자명을 입력해주세요."
                                            disabled={busy}
                                            onChange={(event) => setDepositor(event.target.value)}
                                        />
                                        <p>관리자 입금 확인 전까지 입금 대기 상태로 유지됩니다.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                )}

                <div className="order-detail-actions">
                    <Link to="/mypage/orders">주문 목록</Link>
                    <Link to="/products">쇼핑 계속하기</Link>

                    {order.statusNo === 1 && (
                        <>
                            {!bankPayment && (
                                <button
                                    type="button"
                                    className="order-detail-pay"
                                    disabled={busy}
                                    onClick={() => void (
                                        paymentMethod === 'BANK'
                                            ? handleBankPayment()
                                            : handlePayment()
                                    )}
                                >
                                    {action === 'PAYMENT'
                                        ? '처리 중…'
                                        : paymentMethod === 'BANK'
                                            ? '무통장입금 신청'
                                            : '결제하기'}
                                </button>
                            )}
                            <button type="button" disabled={busy} onClick={() => void handleCancel()}>
                                {action === 'CANCEL' ? '취소 처리 중…' : '주문 취소'}
                            </button>
                        </>
                    )}

                    {canRefund && (
                        <button
                            type="button"
                            className="order-detail-refund"
                            disabled={busy}
                            onClick={() => void handleRefund()}
                        >
                            {action === 'REFUND'
                                ? '취소 확인 중…'
                                : order.cancelStatusNo === 3
                                    ? '결제 취소 재시도'
                                    : '결제 취소'}
                        </button>
                    )}
                </div>
            </div>
        </main>
    );
}