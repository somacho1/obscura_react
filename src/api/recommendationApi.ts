import { apiFetch } from './apiFetch';
export interface RecommendedProduct { no: number; bno: number; name: string; mainImageUrl: string | null; score: number; matchedTags: string[]; }
export interface RecommendedBrand { no: number; name: string; topBrandYn: string; topSeqNo: number; }
export interface RecommendationResponse { ownerNo: number | null; mode: 'AI_TAGS' | 'HISTORY' | 'DEFAULT'; products: RecommendedProduct[]; brands: RecommendedBrand[]; }
export async function getForYouRecommendations(signal?: AbortSignal): Promise<RecommendationResponse> {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9101';
    const response = await apiFetch(`${base}/api/recommendations/for-you?size=7`, { signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`추천 조회 실패 (${response.status})`);
    return response.json() as Promise<RecommendationResponse>;
}
