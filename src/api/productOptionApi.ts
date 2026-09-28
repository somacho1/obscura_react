import type { ProductOptionCreateRequest, ProductOptionResponse } from '../ts/productOption';

const PRODUCT_OPTION_API_URL = 'http://localhost:9101/api/product-options';

export async function createProductOption(data: ProductOptionCreateRequest): Promise<ProductOptionResponse> {
    const response = await fetch(PRODUCT_OPTION_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `상품 옵션 등록 실패: ${response.status}`);
    }

    return response.json();
}