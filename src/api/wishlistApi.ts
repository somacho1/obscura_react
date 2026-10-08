import { apiFetch } from './apiFetch';
import type {
    WishlistCheckResponse,
    WishlistRequest,
    WishlistResponse,
} from '../ts/wishlist';

const WISHLIST_API_URL =
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9101'}/api/wishlists`;

/**
 * 찜 등록
 */
export async function addWishlist(
    request: WishlistRequest,
): Promise<WishlistResponse> {
    const response = await apiFetch(
        WISHLIST_API_URL,
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
            `찜 등록 실패: ${response.status}`,
        );
    }

    return response.json();
}

/**
 * 특정 상품 찜 여부 조회
 */
export async function checkWishlist(
    memberNo: number,
    productNo: number,
): Promise<boolean> {
    const response = await apiFetch(
        `${WISHLIST_API_URL}/member/${memberNo}/product/${productNo}/check`,
    );

    if (!response.ok) {
        const message = await response.text();

        throw new Error(
            message ||
            `찜 여부 조회 실패: ${response.status}`,
        );
    }

    const data: WishlistCheckResponse =
        await response.json();

    return data.wishlisted;
}

/**
 * 찜 삭제
 */
export async function deleteWishlist(
    memberNo: number,
    productNo: number,
): Promise<void> {
    const response = await apiFetch(
        `${WISHLIST_API_URL}/member/${memberNo}/product/${productNo}`,
        {
            method: 'DELETE',
        },
    );

    if (!response.ok) {
        const message = await response.text();

        throw new Error(
            message ||
            `찜 삭제 실패: ${response.status}`,
        );
    }
}

// 로그인 회원의 찜 목록을 최신 등록순으로 조회합니다.
export async function getWishlistsByMember(memberNo: number): Promise<WishlistResponse[]> {
    const response = await apiFetch(`${WISHLIST_API_URL}/member/${memberNo}`);

    if (!response.ok) {
        throw new Error(`찜 목록 조회에 실패했습니다. (${response.status})`);
    }

    return response.json();
}
