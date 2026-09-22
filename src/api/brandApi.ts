import type { BrandResponse } from '../ts/brand';

const BRAND_API_URL = 'http://localhost:9101/api/brands';

export async function getBrands(): Promise<BrandResponse[]> {
    const response = await fetch(BRAND_API_URL);
    if (!response.ok) throw new Error(`브랜드 목록 조회 실패: ${response.status}`);
    return response.json();
}

export async function getBrand(no: number): Promise<BrandResponse> {
    const response = await fetch(`${BRAND_API_URL}/${no}`);
    if (!response.ok) throw new Error(`브랜드 조회 실패: ${response.status}`);
    return response.json();
}