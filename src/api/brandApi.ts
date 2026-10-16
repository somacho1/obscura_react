import { apiFetch } from './apiFetch';
import type { BrandResponse, TopBrandRequest } from '../ts/brand';

const BRAND_API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9101'}/api/brands`;

// 관리자 전체 브랜드 목록
export async function getBrands(): Promise<BrandResponse[]> {
    const response = await apiFetch(BRAND_API_URL);
    if (!response.ok) throw new Error(`브랜드 목록 조회 실패: ${response.status}`);
    return response.json();
}

// 브랜드 단건 조회
export async function getBrand(no: number): Promise<BrandResponse> {
    const response = await apiFetch(`${BRAND_API_URL}/${no}`);
    if (!response.ok) throw new Error(`브랜드 조회 실패: ${response.status}`);
    return response.json();
}

// 메인에 노출할 활성 브랜드를 서버에서 정렬하여 조회합니다.
export async function getTopBrands(signal?: AbortSignal): Promise<BrandResponse[]> {
    const response = await apiFetch(`${BRAND_API_URL}/top-brands`, { signal });
    if (!response.ok) throw new Error('Top Brands 조회에 실패했습니다.');
    return response.json();
}

// 관리자 브랜드 상세페이지에서 노출 여부·순서만 저장합니다.
export async function updateTopBrand(
    no: number,
    data: TopBrandRequest,
): Promise<BrandResponse> {
    const response = await apiFetch(`${BRAND_API_URL}/${no}/top-brand`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error((await response.text()) || 'Top Brands 설정 저장에 실패했습니다.');
    }
    return response.json();
}

// 브랜드 이미지 구분
export type BrandImageType = 'logo' | 'visual';

// 이미지 업로드와 DB 경로 저장을 한 요청으로 처리합니다.
export async function uploadBrandImage(
    brandNo: number,
    type: BrandImageType,
    file: File,
): Promise<BrandResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiFetch(`${BRAND_API_URL}/${brandNo}/images/${type}`, {
        method: 'POST',
        body: formData,
        // Content-Type은 브라우저가 multipart boundary와 함께 설정합니다.
    });

    if (!response.ok) {
        throw new Error((await response.text()) || '브랜드 이미지 업로드에 실패했습니다.');
    }
    return response.json();
}

// 이미지의 DB 연결을 해제합니다.
export async function removeBrandImage(
    brandNo: number,
    type: BrandImageType,
): Promise<BrandResponse> {
    const response = await apiFetch(`${BRAND_API_URL}/${brandNo}/images/${type}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error((await response.text()) || '브랜드 이미지 등록 해제에 실패했습니다.');
    }
    return response.json();
}


// 기본 정보만 보내므로 이미지·Top Brands 설정을 덮어쓰지 않습니다.
export async function updateBrand(no: number, data: { name: string; detail: string; statusNo: number }): Promise<BrandResponse> {
    const response = await apiFetch(`${BRAND_API_URL}/${no}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error((await response.text()) || '브랜드 수정 실패');
    return response.json();
}

// 새 브랜드 기본 정보를 등록합니다. 이미지는 생성된 브랜드 번호로 별도 업로드합니다.
export async function createBrand(data: { name: string; detail: string }): Promise<BrandResponse> {
    const response = await apiFetch(BRAND_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error((await response.text()) || `브랜드 등록 실패: ${response.status}`);
    return response.json();
}

// 상품이 없는 브랜드만 영구삭제합니다. 상품/주문은 자동 삭제하지 않습니다.
export async function deleteEmptyBrand(no: number): Promise<void> {
    const response = await apiFetch(`${BRAND_API_URL}/${no}/permanent`, { method: 'DELETE' });
    if (!response.ok) throw new Error((await response.text()) || '브랜드 삭제에 실패했습니다.');
}
