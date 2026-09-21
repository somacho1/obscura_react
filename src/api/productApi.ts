import type {
    ProductDetailResponse,
    ProductResponse,
} from '../ts/product';

const PRODUCT_API_URL = 'http://localhost:9101/api/products';

/**
 * 판매중인 상품 목록 조회
 */
export async function getActiveProducts(): Promise<ProductResponse[]> {
    const response = await fetch(`${PRODUCT_API_URL}/active`);

    if (!response.ok) {
        throw new Error(`상품 목록 조회 실패: ${response.status}`);
    }

    const data: ProductResponse[] = await response.json();

    return data;
}

/**
 * 상품 상세페이지 조회
 *
 * PRODUCT
 * PRODUCTIMAGE
 * PRODUCTOPTION
 * STOCK
 * 데이터를 백엔드에서 조합한 상세 응답을 가져온다.
 */
export async function getProductDetail(
    productNo: number,
): Promise<ProductDetailResponse> {
    const response = await fetch(
        `${PRODUCT_API_URL}/${productNo}/detail`,
    );

    if (!response.ok) {
        throw new Error(
            `상품 상세 조회 실패: ${response.status}`,
        );
    }

    const data: ProductDetailResponse =
        await response.json();

    return data;
}