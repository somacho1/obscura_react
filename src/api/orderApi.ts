import type { OrderCreateRequest, OrderResponse } from '../ts/order';

const ORDER_API_URL = 'http://localhost:9101/api/orders';

// 선택한 장바구니 상품과 배송지로 주문을 생성합니다.
// 상품 가격·배송비·재고는 백엔드에서 검증하고 계산합니다.
export async function createOrder(request: OrderCreateRequest): Promise<OrderResponse> {
    const response = await fetch(ORDER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    // 백엔드에서 전달한 재고 부족·배송지 오류 등의 안내를 표시합니다.
    if (!response.ok) {
        const text = await response.text();
        let message = `주문 생성에 실패했습니다. (${response.status})`;

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