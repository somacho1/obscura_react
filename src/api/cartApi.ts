import { apiFetch } from './apiFetch';
import type {
    AddCartItemRequest,
    CartItemDetailResponse,
    CartItemResponse,
} from '../ts/cart';

const CART_ITEM_API_URL =
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9101'}/api/cart-items`;

/**
 * 장바구니 상품 추가
 */
export async function addCartItem(
    request: AddCartItemRequest,
): Promise<CartItemResponse> {
    const response = await apiFetch(
        CART_ITEM_API_URL,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        },
    );

    if (!response.ok) {
        const message = await response.text();

        throw new Error(
            message ||
            `장바구니 추가 실패: ${response.status}`,
        );
    }

    return response.json();
}

/**
 * 회원 장바구니 상세조회
 */
export async function getCartItems(
    memberNo: number,
): Promise<CartItemDetailResponse[]> {
    const response = await apiFetch(
        `${CART_ITEM_API_URL}/member/${memberNo}/detail`,
    );

    if (!response.ok) {
        const message = await response.text();

        throw new Error(
            message ||
            `장바구니 조회 실패: ${response.status}`,
        );
    }

    return response.json();
}

/**
 * 장바구니 상품 수량 변경
 */
export async function updateCartItemQty(
    cartItemNo: number,
    qty: number,
): Promise<CartItemResponse> {
    const response = await apiFetch(
        `${CART_ITEM_API_URL}/${cartItemNo}`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                qty,
            }),
        },
    );

    if (!response.ok) {
        const message = await response.text();

        throw new Error(
            message ||
            `수량 변경 실패: ${response.status}`,
        );
    }

    return response.json();
}

/**
 * 장바구니 상품 삭제
 */
export async function deleteCartItem(
    cartItemNo: number,
): Promise<void> {
    const response = await apiFetch(
        `${CART_ITEM_API_URL}/${cartItemNo}`,
        {
            method: 'DELETE',
        },
    );

    if (!response.ok) {
        const message = await response.text();

        throw new Error(
            message ||
            `장바구니 삭제 실패: ${response.status}`,
        );
    }
}
