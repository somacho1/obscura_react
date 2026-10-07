import { Link, useSearchParams } from 'react-router-dom';
import './PaymentPage.css';

export default function PaymentFailPage() {
    const [searchParams] = useSearchParams();
    const code = searchParams.get('code') ?? '';

    // 결제창 호출 시 failUrl에 넣어둔 주문번호를 사용합니다.
    // Toss가 orderId를 반환하지 않는 결제 중단 상황에서도 주문으로 돌아갈 수 있습니다.
    const orderNoText = searchParams.get('orderNo') ?? '';
    const orderNo = Number(orderNoText);
    const validOrderNo = /^[1-9]\d*$/.test(orderNoText) && Number.isSafeInteger(orderNo);
    const cancelled = code === 'PAY_PROCESS_CANCELED' || code === 'USER_CANCEL';

    return (
        <main className="payment-page">
            <div className="payment-result">
                <span className="payment-label">PAYMENT</span>
                <h1>{cancelled ? '결제가 중단되었습니다' : '결제를 진행하지 못했습니다'}</h1>
                <p>
                    {cancelled ? '결제창을 닫거나 결제 진행을 취소하셨습니다.' : '결제 과정에서 오류가 발생했습니다.'}
                    <br />
                    주문 상세에서 현재 상태를 확인하고 다시 진행해주세요.
                </p>

                {/* 이 화면에서는 주문 취소 API나 재고 복구를 자동 실행하지 않습니다. */}
                <div className="payment-actions">
                    {validOrderNo && <Link className="payment-primary" to={`/orders/${orderNo}`}>주문 확인</Link>}
                    <Link className="payment-secondary" to="/products">쇼핑 계속하기</Link>
                </div>
            </div>
        </main>
    );
}