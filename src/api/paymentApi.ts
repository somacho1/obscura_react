import type { BankPaymentRequest, PaymentResponse, TossConfirmRequest } from '../ts/payment';

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

// 무통장입금을 신청합니다. 실제 입금 확인 전에는 결제 완료로 처리하지 않습니다.
export async function applyBankPayment(request: BankPaymentRequest): Promise<PaymentResponse> {
    const response = await fetch(`${PAYMENT_API_URL}/bank/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    // 다른 회원의 주문·취소된 주문·결제수단 충돌 등의 서버 안내를 전달합니다.
    if (!response.ok) {
        const text = await response.text();
        let message = `무통장입금 신청에 실패했습니다. (${response.status})`;
        if (text.trim()) {
            try {
                const error: unknown = JSON.parse(text);
                if (typeof error === 'string') message = error;
                else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') message = error.message;
            } catch {
                message = text;
            }
        }
        throw new Error(message);
    }

    return response.json();
}

// 주문번호로 저장된 결제정보를 조회합니다.
// 무통장입금 신청 후 화면을 다시 열어도 입금자명·금액·상태를 복원할 때 사용합니다.
export async function getPaymentByOrder(orderNo: number): Promise<PaymentResponse | null> {
    const response = await fetch(`${PAYMENT_API_URL}/order/${orderNo}`);

    // 204는 결제 미신청 상태입니다. JSON 본문이 없으므로 바로 반환합니다.
    if (response.status === 204) return null;

    // 조회 실패를 미신청 상태로 취급하지 않고 서버의 오류 안내를 전달합니다.
    if (!response.ok) {
        const text = await response.text();
        let message = `결제정보 조회에 실패했습니다. (${response.status})`;

        if (text.trim()) {
            try {
                const error: unknown = JSON.parse(text);
                if (typeof error === 'string') message = error;
                else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') message = error.message;
            } catch {
                message = text;
            }
        }
        throw new Error(message);
    }

    return response.json();
}

// 관리자가 무통장입금을 확인합니다.
// 서버에서 결제 상태를 결제 완료로, 주문 상태를 결제 완료로 함께 변경합니다.
export async function confirmBankDeposit(orderNo: number): Promise<PaymentResponse> {
    const response = await fetch(`${PAYMENT_API_URL}/bank/order/${orderNo}/confirm`, {
        method: 'PUT',
    });

    // 입금 확인이 불가능한 주문 등의 서버 안내를 전달합니다.
    if (!response.ok) {
        const text = await response.text();
        let message = `입금 확인에 실패했습니다. (${response.status})`;

        if (text.trim()) {
            try {
                const error: unknown = JSON.parse(text);
                if (typeof error === 'string') message = error;
                else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') message = error.message;
            } catch {
                message = text;
            }
        }
        throw new Error(message);
    }

    return response.json();
}