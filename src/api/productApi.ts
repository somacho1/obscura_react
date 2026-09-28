import type { ProductBulkDiscountRequest, ProductCreateRequest, ProductDetailResponse, ProductResponse } from '../ts/product';

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


// 브랜드별 상품 목록 조회
// 관리자 브랜드 상세 페이지에서 해당 브랜드에 등록된 상품들을 조회할 때 사용
export async function getProductsByBrand(brandNo: number): Promise<ProductResponse[]> {
    const response = await fetch(`${PRODUCT_API_URL}/brand/${brandNo}`);
    if (!response.ok) throw new Error(`브랜드 상품 조회 실패: ${response.status}`);
    return response.json();
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

// 관리자 선택 상품 할인율 일괄 적용
export async function updateBulkDiscount(data: ProductBulkDiscountRequest): Promise<void> {
    const response = await fetch(`${PRODUCT_API_URL}/bulk-discount`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `할인율 적용 실패: ${response.status}`);
    }
}

// 관리자 상품 등록
export async function createProduct(data: ProductCreateRequest): Promise<ProductResponse> {
    const response = await fetch(PRODUCT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `상품 등록 실패: ${response.status}`);
    }

    return response.json();
}

// 관리자 상품 단건 조회
export async function getProduct(productNo: number): Promise<ProductResponse> {
    const response = await fetch(`${PRODUCT_API_URL}/${productNo}`);
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `상품 조회 실패: ${response.status}`);
    }
    return response.json();
}

// 관리자 상품 수정
export async function updateProduct(productNo: number, data: ProductCreateRequest): Promise<ProductResponse> {
    const response = await fetch(`${PRODUCT_API_URL}/${productNo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `상품 수정 실패: ${response.status}`);
    }
    return response.json();
}

// 관리자 상품 비활성화
export async function disableProduct(productNo: number): Promise<void> {
    const response = await fetch(`${PRODUCT_API_URL}/${productNo}`, { method: 'DELETE' });
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `상품 비활성화 실패: ${response.status}`);
    }
}