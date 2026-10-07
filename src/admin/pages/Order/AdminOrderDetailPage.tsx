import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { confirmBankDeposit, getPaymentByOrder } from '../../../api/paymentApi';
import { getOrderDetail } from '../../../api/orderApi';
import { getDeliveriesByOrder, startDeliveryShipping, completeDeliveryShipping } from '../../../api/deliveryApi';
import type { OrderResponse } from '../../../ts/order';
import type { PaymentResponse } from '../../../ts/payment';
import type { DeliveryResponse } from '../../../ts/delivery';
import './AdminOrderDetailPage.css';

// 주문·결제·배송 상태 표시
const ORDER_STATUS: Record<number, string> = {
    0: '주문 취소', 1: '결제 대기', 2: '결제 완료',
    3: '상품 준비', 4: '배송 중', 5: '배송 완료',
};
const PAYMENT_STATUS: Record<number, string> = {
    0: '결제 대기', 1: '결제 완료', 2: '부분 취소',
    3: '전체 취소', 4: '결제 실패',
};
const DELIVERY_STATUS: Record<number, string> = {
    0: '배송 준비', 1: '배송 중', 2: '배송 완료',
};

type ShippingInput = { company: string; trackingNo: string };

// 날짜가 없거나 잘못된 값이면 '-' 표시
function formatDate(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
}

export default function AdminOrderDetailPage() {
    const { orderNo } = useParams();

    // 상세 조회 상태
    const [order, setOrder] = useState<OrderResponse | null>(null);
    const [payment, setPayment] = useState<PaymentResponse | null>(null);
    const [deliveries, setDeliveries] = useState<DeliveryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    // 입금 확인 상태
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [confirmError, setConfirmError] = useState('');
    const confirmingRef = useRef(false);

    // 배송별 입력값과 출고·완료 처리 상태
    const [shippingInputs, setShippingInputs] = useState<Record<number, ShippingInput>>({});
    const [shippingLoadingNo, setShippingLoadingNo] = useState<number | null>(null);
    const [completeLoadingNo, setCompleteLoadingNo] = useState<number | null>(null);
    const [shippingError, setShippingError] = useState('');
    const shippingRef = useRef(false);
    const completingRef = useRef(false);

    const processing = confirmLoading || shippingLoadingNo !== null || completeLoadingNo !== null;

    // 주문·결제·배송정보를 함께 조회
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        setConfirmError('');
        setShippingError('');
        setOrder(null);
        setPayment(null);
        setDeliveries([]);
        setShippingInputs({});

        async function loadDetail() {
            try {
                const no = Number(orderNo);
                if (!orderNo || !/^[1-9]\d*$/.test(orderNo) || !Number.isSafeInteger(no)) {
                    throw new Error('잘못된 주문번호입니다.');
                }

                const [orderData, paymentData, deliveryData] = await Promise.all([
                    getOrderDetail(no),
                    getPaymentByOrder(no),
                    getDeliveriesByOrder(no),
                ]);
                if (cancelled) return;

                if (
                    orderData.no !== no
                    || (paymentData && paymentData.ordno !== no)
                    || deliveryData.some(item => item.ordno !== no)
                ) {
                    throw new Error('주문 상세정보가 일치하지 않습니다.');
                }

                const inputs: Record<number, ShippingInput> = {};
                deliveryData.forEach(delivery => {
                    inputs[delivery.no] = {
                        company: delivery.company || 'CJ대한통운',
                        trackingNo: delivery.trackingNo || '',
                    };
                });

                setOrder(orderData);
                setPayment(paymentData);
                setDeliveries(deliveryData);
                setShippingInputs(inputs);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : '주문 정보를 불러오지 못했습니다.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadDetail();
        return () => { cancelled = true; };
    }, [orderNo, retryCount]);

    // 해당 배송의 입력값만 변경
    const updateShippingInput = (deliveryNo: number, field: keyof ShippingInput, value: string) => {
        setShippingInputs(previous => ({
            ...previous,
            [deliveryNo]: {
                company: previous[deliveryNo]?.company ?? 'CJ대한통운',
                trackingNo: previous[deliveryNo]?.trackingNo ?? '',
                [field]: value,
            },
        }));
    };

    // 무통장입금 확인
    const handleConfirmDeposit = async () => {
        if (!order || !payment || confirmingRef.current || shippingRef.current || completingRef.current) return;
        if (order.statusNo !== 1 || payment.method !== 'BANK' || payment.statusNo !== 0) return;

        const message = `주문번호: ${order.no}\n입금자명: ${payment.depositor || '-'}\n입금 금액: ${payment.amount.toLocaleString('ko-KR')}원\n\n입금 확인 완료로 처리하시겠습니까?`;
        if (!window.confirm(message)) return;

        confirmingRef.current = true;
        setConfirmLoading(true);
        setConfirmError('');

        try {
            await confirmBankDeposit(order.no);
            setRetryCount(count => count + 1);
        } catch (err) {
            setConfirmError(err instanceof Error ? err.message : '입금 확인에 실패했습니다.');
        } finally {
            confirmingRef.current = false;
            setConfirmLoading(false);
        }
    };

    // 송장정보 등록 및 출고 처리
    const handleStartShipping = async (delivery: DeliveryResponse) => {
        if (!order || shippingRef.current || confirmingRef.current || completingRef.current) return;
        if (delivery.ordno !== order.no) return;
        if (![2, 3, 4].includes(order.statusNo) || delivery.statusNo !== 0) return;

        const input = shippingInputs[delivery.no];
        const company = input?.company.trim() || '';
        const trackingNo = input?.trackingNo.trim() || '';
        setShippingError('');

        if (!company || !trackingNo) {
            setShippingError(`배송 #${delivery.no}: 택배사와 송장번호를 입력해주세요.`);
            return;
        }
        if (company.length > 50 || trackingNo.length > 100) {
            setShippingError('택배사는 50자, 송장번호는 100자 이내로 입력해주세요.');
            return;
        }

        const message = `주문번호: ${order.no}\n배송번호: ${delivery.no}\n택배사: ${company}\n송장번호: ${trackingNo}\n\n출고 처리하시겠습니까?`;
        if (!window.confirm(message)) return;

        shippingRef.current = true;
        setShippingLoadingNo(delivery.no);

        try {
            await startDeliveryShipping(delivery.no, company, trackingNo);
            setRetryCount(count => count + 1);
        } catch (err) {
            setShippingError(err instanceof Error ? err.message : '출고 처리에 실패했습니다.');
        } finally {
            shippingRef.current = false;
            setShippingLoadingNo(null);
        }
    };

    // 개별 배송 완료 후 서버의 주문 상태를 다시 조회
    const handleCompleteShipping = async (delivery: DeliveryResponse) => {
        if (!order || completingRef.current || shippingRef.current || confirmingRef.current) return;
        if (delivery.ordno !== order.no) return;
        if (order.statusNo !== 4 || delivery.statusNo !== 1) return;

        setShippingError('');
        const message = `주문번호: ${order.no}\n배송번호: ${delivery.no}\n택배사: ${delivery.company || '-'}\n송장번호: ${delivery.trackingNo || '-'}\n\n배송 완료로 처리하시겠습니까?`;
        if (!window.confirm(message)) return;

        completingRef.current = true;
        setCompleteLoadingNo(delivery.no);

        try {
            await completeDeliveryShipping(delivery.no);
            setRetryCount(count => count + 1);
        } catch (err) {
            setShippingError(err instanceof Error ? err.message : '배송 완료 처리에 실패했습니다.');
        } finally {
            completingRef.current = false;
            setCompleteLoadingNo(null);
        }
    };

    if (loading) {
        return (
            <main className="admin-order-detail">
                <div className="admin-order-detail__state" role="status">
                    주문 상세정보를 불러오는 중입니다.
                </div>
            </main>
        );
    }

    if (error || !order) {
        return (
            <main className="admin-order-detail">
                <div className="admin-order-detail__state" role="alert">
                    <p>{error || '주문 정보가 없습니다.'}</p>
                    <button type="button" onClick={() => setRetryCount(count => count + 1)}>다시 조회</button>
                    <Link to="/admin/orders">주문 목록</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="admin-order-detail">
            <header className="admin-order-detail__heading">
                <div>
                    <p>ORDER DETAIL</p>
                    <h1>주문 상세 <span>#{order.no}</span></h1>
                </div>
                <div className="admin-order-detail__heading-actions">
                    <button type="button" disabled={processing} onClick={() => setRetryCount(count => count + 1)}>
                        새로고침
                    </button>
                    <Link to="/admin/orders">주문 목록</Link>
                </div>
            </header>

            {/* 주문 기본정보 */}
            <section className="admin-order-detail__section">
                <h2>주문 정보</h2>
                <dl className="admin-order-detail__info">
                    <div><dt>주문번호</dt><dd>{order.no}</dd></div>
                    <div><dt>회원번호</dt><dd>{order.mno}</dd></div>
                    <div><dt>주문일시</dt><dd>{formatDate(order.cdate)}</dd></div>
                    <div><dt>주문 상태</dt><dd><strong>{ORDER_STATUS[order.statusNo] ?? '확인 필요'}</strong></dd></div>
                    <div><dt>상품 금액</dt><dd>{(order.totalPrice - order.shippingFee).toLocaleString('ko-KR')}원</dd></div>
                    <div><dt>배송비</dt><dd>{order.shippingFee === 0 ? '무료' : `${order.shippingFee.toLocaleString('ko-KR')}원`}</dd></div>
                    <div><dt>총 주문 금액</dt><dd><strong>{order.totalPrice.toLocaleString('ko-KR')}원</strong></dd></div>
                </dl>
            </section>

            {/* 주문 당시 상품정보 */}
            <section className="admin-order-detail__section">
                <h2>주문 상품</h2>
                {order.items.length === 0 ? (
                    <p className="admin-order-detail__empty">주문 상품 정보가 없습니다.</p>
                ) : (
                    <div className="admin-order-detail__table-wrap">
                        <table className="admin-order-detail__table">
                            <thead>
                                <tr>
                                    <th scope="col">상품명</th>
                                    <th scope="col">COLOR / SIZE</th>
                                    <th scope="col">단가</th>
                                    <th scope="col">주문 수량</th>
                                    <th scope="col">취소 수량</th>
                                    <th scope="col">주문 금액</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map(item => (
                                    <tr key={item.no}>
                                        <td className="admin-order-detail__product">{item.productName}</td>
                                        <td>{item.color || '-'} / {item.sizeValue || '-'}</td>
                                        <td>{item.price.toLocaleString('ko-KR')}원</td>
                                        <td>{item.qty}개</td>
                                        <td>{item.cancelQty}개</td>
                                        <td><strong>{(item.price * item.qty).toLocaleString('ko-KR')}원</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* 결제정보 및 입금 확인 */}
            <section className="admin-order-detail__section">
                <h2>결제 정보</h2>
                {payment ? (
                    <>
                        <dl className="admin-order-detail__info">
                            <div><dt>결제번호</dt><dd>{payment.no}</dd></div>
                            <div><dt>결제수단</dt><dd>{payment.method === 'BANK' ? '무통장입금' : 'Toss 카드 / 간편결제'}</dd></div>
                            <div>
                                <dt>결제 상태</dt>
                                <dd><strong>{payment.method === 'BANK' && payment.statusNo === 0 ? '입금 대기' : PAYMENT_STATUS[payment.statusNo] ?? '확인 필요'}</strong></dd>
                            </div>
                            <div><dt>결제 금액</dt><dd>{payment.amount.toLocaleString('ko-KR')}원</dd></div>
                            {payment.method === 'BANK' && <div><dt>입금자명</dt><dd>{payment.depositor || '-'}</dd></div>}
                            <div><dt>승인일시</dt><dd>{formatDate(payment.approveDate)}</dd></div>
                            <div><dt>취소일시</dt><dd>{formatDate(payment.cancelDate)}</dd></div>
                        </dl>
                        {payment.method === 'BANK' && payment.statusNo === 0 && order.statusNo === 1 && (
                            <div className="admin-order-detail__notice">
                                <p>무통장입금 확인이 필요한 주문입니다.</p>
                                <button
                                    type="button"
                                    className="admin-order-detail__confirm-button"
                                    disabled={processing}
                                    onClick={() => void handleConfirmDeposit()}
                                >
                                    {confirmLoading ? '처리 중...' : '입금 확인'}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="admin-order-detail__empty">아직 결제 신청 정보가 없습니다.</p>
                )}
                {confirmError && <p className="admin-order-detail__confirm-error" role="alert">{confirmError}</p>}
            </section>

            {/* 배송별 정보 및 처리 버튼 */}
            <section className="admin-order-detail__section">
                <h2>배송 정보</h2>
                {deliveries.length === 0 ? (
                    <p className="admin-order-detail__empty">등록된 배송정보가 없습니다.</p>
                ) : deliveries.map(delivery => (
                    <article className="admin-order-detail__delivery" key={delivery.no}>
                        <h3>
                            배송 #{delivery.no}
                            <span>{DELIVERY_STATUS[delivery.statusNo] ?? '확인 필요'}</span>
                        </h3>
                        <dl className="admin-order-detail__info">
                            <div><dt>받는 사람</dt><dd>{delivery.receiver}</dd></div>
                            <div><dt>연락처</dt><dd>{delivery.phone}</dd></div>
                            <div className="admin-order-detail__info-wide">
                                <dt>배송지</dt>
                                <dd>({delivery.zipcode}) {delivery.address1}{delivery.address2 ? ` ${delivery.address2}` : ''}</dd>
                            </div>
                            <div><dt>택배사</dt><dd>{delivery.company || '-'}</dd></div>
                            <div><dt>송장번호</dt><dd>{delivery.trackingNo || '-'}</dd></div>
                            <div><dt>출고일시</dt><dd>{formatDate(delivery.shipDate)}</dd></div>
                            <div><dt>배송완료일시</dt><dd>{formatDate(delivery.deliveryDate)}</dd></div>
                        </dl>

                        {/* 배송 준비 상태: 송장 입력 및 출고 */}
                        {[2, 3, 4].includes(order.statusNo) && delivery.statusNo === 0 && (
                            <div className="admin-order-detail__shipping-form">
                                <label>
                                    <span>택배사</span>
                                    <input
                                        type="text"
                                        maxLength={50}
                                        placeholder="택배사 입력"
                                        value={shippingInputs[delivery.no]?.company ?? 'CJ대한통운'}
                                        disabled={processing}
                                        onChange={event => updateShippingInput(delivery.no, 'company', event.target.value)}
                                    />
                                </label>
                                <label>
                                    <span>송장번호</span>
                                    <input
                                        type="text"
                                        maxLength={100}
                                        placeholder="송장번호 입력"
                                        value={shippingInputs[delivery.no]?.trackingNo ?? ''}
                                        disabled={processing}
                                        onChange={event => updateShippingInput(delivery.no, 'trackingNo', event.target.value)}
                                    />
                                </label>
                                <button
                                    type="button"
                                    className="admin-order-detail__confirm-button"
                                    disabled={processing}
                                    onClick={() => void handleStartShipping(delivery)}
                                >
                                    {shippingLoadingNo === delivery.no ? '처리 중...' : '출고 처리'}
                                </button>
                            </div>
                        )}

                        {/* 배송 중 상태: 배송 완료 처리 */}
                        {order.statusNo === 4 && delivery.statusNo === 1 && (
                            <div className="admin-order-detail__delivery-actions">
                                <p>실제 배송 완료 여부를 확인한 뒤 처리해주세요.</p>
                                <button
                                    type="button"
                                    className="admin-order-detail__confirm-button"
                                    disabled={processing}
                                    onClick={() => void handleCompleteShipping(delivery)}
                                >
                                    {completeLoadingNo === delivery.no ? '처리 중...' : '배송 완료'}
                                </button>
                            </div>
                        )}
                    </article>
                ))}
                {shippingError && <p className="admin-order-detail__confirm-error" role="alert">{shippingError}</p>}
            </section>
        </main>
    );
}