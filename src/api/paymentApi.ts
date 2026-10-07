import type { PaymentResponse, TossConfirmRequest } from '../ts/payment';

const PAYMENT_API_URL = 'http://localhost:9101/api/payments';

// Toss 인증 결과를 백엔드로 보내 결제 승인을 요청합니다.
// 시크릿 키와 Toss 승인 API 호출은 백엔드에서만 처리합니다.
export async function confirmTossPayment(request: TossConfirmRequest): Promise<PaymentResponse> {
    const response = await fetch(`${PAYMENT_API_URL}/toss/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const text = await response.text();
        let message = `결제 승인 결과를 확인하지 못했습니다. (${response.status})`;

        if (text.trim()) {
            try {
                const error: unknown = JSON.parse(text);
                if (typeof error === 'string') message = error;
                else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
                    message = error.message;
                }
            } catch {
                message = text;
            }
        }

        // 오류가 발생했다고 주문 취소 API를 자동 호출하지 않습니다.
        throw new Error(message);
    }

    return response.json();
}