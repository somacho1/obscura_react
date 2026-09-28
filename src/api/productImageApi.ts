import type { ProductImageResponse } from '../ts/productImage';

const PRODUCT_IMAGE_API_URL = 'http://localhost:9101/api/product-images';

export async function uploadMainImage(productNo: number, file: File): Promise<ProductImageResponse> {
    const formData = new FormData();
    formData.append('pno', String(productNo));
    formData.append('file', file);

    const response = await fetch(`${PRODUCT_IMAGE_API_URL}/upload/main`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `대표 이미지 업로드 실패: ${response.status}`);
    }

    return response.json();
}

export async function uploadDetailImages(productNo: number, files: File[]): Promise<ProductImageResponse[]> {
    const formData = new FormData();
    formData.append('pno', String(productNo));

    files.forEach((file) => {
        formData.append('files', file);
    });

    const response = await fetch(`${PRODUCT_IMAGE_API_URL}/upload/detail`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `상세 이미지 업로드 실패: ${response.status}`);
    }

    return response.json();
}