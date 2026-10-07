import type { DeliveryResponse } from '../ts/delivery';

const DELIVERY_API_URL = 'http://localhost:9101/api/deliveries';

// 주문번호에 속한 배송정보를 조회합니다.
// 부분배송을 고려해 첫 번째 배송만 가져오지 않고 전체 배열을 반환합니다.
export async function getDeliveriesByOrder(orderNo: number): Promise<DeliveryResponse[]> {
    const response = await fetch(`${DELIVERY_API_URL}/order/${orderNo}`);

    // 조회 오류를 배송정보 없음으로 처리하지 않고 화면에 안내합니다.
    if (!response.ok) {
        const text = await response.text();
        let message = `배송정보 조회에 실패했습니다. (${response.status})`;

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

// 배송번호로 출고를 요청합니다.
// 주문번호가 아닌 배송정보의 no를 전달해야 합니다.
export async function startDeliveryShipping(
    deliveryNo: number,
    company: string,
    trackingNo: string,
): Promise<DeliveryResponse> {
    if (!Number.isSafeInteger(deliveryNo) || deliveryNo <= 0) {
        throw new Error('잘못된 배송번호입니다.');
    }
    if (!company.trim()) {
        throw new Error('택배사를 입력해주세요.');
    }
    if (!trackingNo.trim()) {
        throw new Error('송장번호를 입력해주세요.');
    }

    // 조회와 출고 요청에 같은 서버 주소를 사용합니다.
    const response = await fetch(`${DELIVERY_API_URL}/${deliveryNo}/shipping`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // 상태와 출고일시는 서버에서 결정하며, 화면에서는 송장정보만 보냅니다.
        body: JSON.stringify({
            company: company.trim(),
            trackingNo: trackingNo.trim(),
        }),
    });

    // 서버의 상태 검증 오류를 관리자 화면에 전달합니다.
    if (!response.ok) {
        const text = await response.text();
        let message = `출고 처리에 실패했습니다. (${response.status})`;

        if (text.trim()) {
            try {
                const error: unknown = JSON.parse(text);
                if (typeof error === 'string') {
                    message = error;
                } else if (
                    error && typeof error === 'object'
                    && 'message' in error && typeof error.message === 'string'
                ) {
                    message = error.message;
                }
            } catch {
                message = text;
            }
        }
        throw new Error(message);
    }

    return response.json();
}

// 주문번호가 아닌 배송번호로 해당 배송을 완료 처리합니다.
// 모든 배송이 완료됐는지는 서버에서 판단하여 주문 상태에 반영합니다.
export async function completeDeliveryShipping(deliveryNo: number): Promise<DeliveryResponse> {
    if (!Number.isSafeInteger(deliveryNo) || deliveryNo <= 0) {
        throw new Error('잘못된 배송번호입니다.');
    }

    // 배송 상태와 완료일시는 서버에서 결정하므로 요청 본문은 필요 없습니다.
    const response = await fetch(`${DELIVERY_API_URL}/${deliveryNo}/complete`, {
        method: 'PUT',
    });

    // 배송 준비 상태 등 완료 처리할 수 없는 경우 서버 안내를 전달합니다.
    if (!response.ok) {
        const text = await response.text();
        let message = `배송 완료 처리에 실패했습니다. (${response.status})`;

        if (text.trim()) {
            try {
                const error: unknown = JSON.parse(text);
                if (typeof error === 'string') {
                    message = error;
                } else if (
                    error && typeof error === 'object'
                    && 'message' in error && typeof error.message === 'string'
                ) {
                    message = error.message;
                }
            } catch {
                message = text;
            }
        }
        throw new Error(message);
    }

    return response.json();
}