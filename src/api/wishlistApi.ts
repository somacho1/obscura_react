import type {
    WishlistCheckResponse,
    WishlistRequest,
    WishlistResponse,
} from '../ts/wishlist';

const WISHLIST_API_URL =
    'http://localhost:9101/api/wishlists';

/**
 * 찜 등록
 */
export async function addWishlist(
    request: WishlistRequest,
): Promise<WishlistResponse> {
    const response = await fetch(
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
    const response = await fetch(
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
    const response = await fetch(
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