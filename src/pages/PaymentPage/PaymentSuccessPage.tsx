import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmTossPayment } from '../../api/paymentApi';
import { useAuth } from '../../context/AuthContext';
import type { PaymentResponse } from '../../ts/payment';
import './PaymentPage.css';

export default function PaymentSuccessPage() {
    const { member } = useAuth();
    const memberNo = member?.no;
    const [searchParams] = useSearchParams();
    const paymentKey = searchParams.get('paymentKey') ?? '';
    const orderId = searchParams.get('orderId') ?? '';
    const amountText = searchParams.get('amount') ?? '';

    const [payment, setPayment] = useState<PaymentResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    const orderNoText = /^OBSCURA_[1-9]\d*$/.test(orderId) ? orderId.substring('OBSCURA_'.length) : '';
    const orderNo = Number(orderNoText);
    const validOrderNo = orderNoText !== '' && Number.isSafeInteger(orderNo) && orderNo > 0;

    // StrictMode에서 요청이 다시 실행돼도 백엔드는 동일 승인 요청을 중복 완료 처리하지 않습니다.
    useEffect(() => {
        let cancelled = false;
        setPayment(null);
        setError('');

        if (memberNo === undefined) {
            setLoading(false);
            return;
        }

        const currentMemberNo = memberNo;
        setLoading(true);

        async function approvePayment() {
            try {
                const amount = Number(amountText);

                // URL 값의 형식을 검사하고 실제 금액 검증은 백엔드에서 진행합니다.
                if (!paymentKey || paymentKey.length > 200 || !validOrderNo || orderId.length > 64
                    || !/^[1-9]\d*$/.test(amountText) || !Number.isSafeInteger(amount)) {
                    throw new Error('결제 인증 정보가 올바르지 않습니다.');
                }

                const result = await confirmTossPayment({
                    mno: currentMemberNo,
                    paymentKey,
                    orderId,
                    amount,
                });

                if (result.statusNo !== 1 || result.ordno !== orderNo || result.amount !== amount
                    || result.paymentKey !== paymentKey || result.method !== 'TOSS') {
                    throw new Error('결제 완료 결과를 확인하지 못했습니다. 주문 상태를 확인해주세요.');
                }

                if (!cancelled) setPayment(result);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : '결제 승인 결과를 확인하지 못했습니다.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void approvePayment();
        return () => { cancelled = true; };
    }, [memberNo, paymentKey, orderId, amountText, orderNo, validOrderNo, retryCount]);

    if (!member) {
        return (
            <main className="payment-page">
                <div className="payment-result">
                    <h1>로그인이 필요합니다</h1>
                    <p>주문한 계정으로 로그인한 뒤 이 결제 결과 주소로 돌아와주세요.</p>
                    <Link className="payment-primary" to="/login">로그인</Link>
                </div>
            </main>
        );
    }

    if (loading) {
        return (
            <main className="payment-page">
                <div className="payment-result" role="status">
                    <span className="payment-label">PAYMENT</span>
                    <h1>결제를 확인하고 있습니다</h1>
                    <p>승인 결과를 확인할 때까지 잠시 기다려주세요.</p>
                </div>
            </main>
        );
    }

    if (error || !payment) {
        return (
            <main className="payment-page">
                <div className="payment-result" role="alert">
                    <span className="payment-label">PAYMENT CHECK</span>
                    <h1>결제 결과 확인이 필요합니다</h1>
                    <p>{error || '결제정보가 없습니다.'}</p>
                    {/* 통신 오류만으로 주문 취소나 재고 복구를 실행하지 않습니다. */}
                    <div className="payment-actions">
                        <button type="button" className="payment-primary" onClick={() => setRetryCount(count => count + 1)}>승인 다시 확인</button>
                        {validOrderNo && <Link className="payment-secondary" to={`/orders/${orderNo}`}>주문 확인</Link>}
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="payment-page">
            <div className="payment-result">
                <span className="payment-label">ORDER COMPLETE</span>
                <h1>결제가 완료되었습니다</h1>
                <p>주문해주셔서 감사합니다.</p>
                {/* 백엔드가 승인 후 반환한 실제 결제정보를 표시합니다. */}
                <dl className="payment-info">
                    <div><dt>주문번호</dt><dd>{payment.ordno}</dd></div>
                    <div><dt>결제금액</dt><dd>{payment.amount.toLocaleString('ko-KR')}원</dd></div>
                    <div><dt>결제상태</dt><dd>결제 완료</dd></div>
                </dl>
                <div className="payment-actions">
                    <Link className="payment-primary" to={`/orders/${payment.ordno}`}>주문 상세</Link>
                    <Link className="payment-secondary" to="/products">쇼핑 계속하기</Link>
                </div>
            </div>
        </main>
    );
}