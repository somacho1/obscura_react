import type { OrderCreateRequest, OrderResponse } from '../ts/order';

const ORDER_API_URL = 'http://localhost:9101/api/orders';

// 서버 오류가 일반 문자열 또는 JSON으로 와도 안내 메시지를 추출합니다.
async function getErrorMessage(response: Response, fallback: string): Promise<string> {
    const text = await response.text();
    if (!text.trim()) return `${fallback} (${response.status})`;

    try {
        const error: unknown = JSON.parse(text);
        if (typeof error === 'string') return error;
        if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
            return error.message;
        }
    } catch {
        return text;
    }

    return `${fallback} (${response.status})`;
}

// 선택한 장바구니 상품과 배송지로 주문을 생성합니다.
// 최종 금액 계산과 재고 검증은 백엔드에서 처리합니다.
export async function createOrder(request: OrderCreateRequest): Promise<OrderResponse> {
    const response = await fetch(ORDER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response, '주문 생성에 실패했습니다.'));
    }

    return response.json();
}

// 결제 대기 주문을 취소합니다.
// 백엔드에서 취소 상태를 저장하고 차감한 재고를 복구합니다.
export async function cancelPendingOrder(orderNo: number, memberNo: number): Promise<OrderResponse> {
    const response = await fetch(`${ORDER_API_URL}/${orderNo}/cancel-pending`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mno: memberNo }),
    });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response, '주문 취소에 실패했습니다.'));
    }

    return response.json();
}

// 페이지를 이동하거나 새로고침한 뒤에도 저장된 주문을 다시 조회합니다.
export async function getOrderDetail(orderNo: number): Promise<OrderResponse> {
    const response = await fetch(`${ORDER_API_URL}/${orderNo}`);

    if (!response.ok) {
        throw new Error(await getErrorMessage(response, '주문 조회에 실패했습니다.'));
    }

    return response.json();
}