import { apiFetch } from './apiFetch';
import type { CategoryResponse } from '../ts/category';

const CATEGORY_API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9101'}/api/categories`;

// 관리자용 전체 카테고리 조회
// 상품 등록/수정 화면의 CATEGORY 선택 목록에서 사용
export async function getCategories(): Promise<CategoryResponse[]> {
    const response = await apiFetch(CATEGORY_API_URL);
    if (!response.ok) throw new Error(`카테고리 목록 조회 실패: ${response.status}`);
    return response.json();
}

// 사용자용 활성 카테고리 조회
// STATUSNO = 1인 카테고리만 조회
export async function getActiveCategories(): Promise<CategoryResponse[]> {
    const response = await apiFetch(`${CATEGORY_API_URL}/active`);
    if (!response.ok) throw new Error(`활성 카테고리 목록 조회 실패: ${response.status}`);
    return response.json();
}
