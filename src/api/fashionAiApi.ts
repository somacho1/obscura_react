import { apiFetch } from './apiFetch';
export type FashionCategory = 'AUTO' | 'TOP' | 'BOTTOM' | 'DRESS' | 'OUTER' | 'SHOES' | 'BAG' | 'ACCESSORY';
export type TagGroup = 'type' | 'pattern' | 'style' | 'knit';
export interface FashionTag { group: TagGroup; label: string; score: number; }
export interface FashionCandidate { label: string; score: number; }
export interface FashionAnalysis {
    model: string; category: FashionCategory; requiresReview: boolean; imageCount?: number;
    groups: { productType: FashionCandidate[]; pattern: FashionCandidate[]; style: FashionCandidate[]; knitTexture?: FashionCandidate[] };
}
const BASE = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9101'}/api/admin/fashion-ai`;
export class FashionApiError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
}
async function read<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text();
        let message = text;
        try { const data = JSON.parse(text); message = typeof data.message === 'string' ? data.message : typeof data.detail === 'string' ? data.detail : '입력 정보를 확인해주세요.'; } catch { /* 텍스트 오류 응답도 표시 */ }
        throw new FashionApiError(response.status, message || `요청 실패 (${response.status})`);
    }
    return response.json() as Promise<T>;
}
export async function analyzeFashion(file: File | File[], category: FashionCategory, signal?: AbortSignal): Promise<FashionAnalysis> {
    const body = new FormData(); (Array.isArray(file) ? file : [file]).forEach(image => body.append('files', image)); body.append('category', category);
    return read(await apiFetch(`${BASE}/analyze`, { method: 'POST', body, signal }));
}
export async function getFashionTags(pno: number): Promise<FashionTag[]> {
    return read(await apiFetch(`${BASE}/products/${pno}/tags`));
}
export async function saveFashionTags(pno: number, tags: FashionTag[]): Promise<FashionTag[]> {
    return read(await apiFetch(`${BASE}/products/${pno}/tags`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tags) }));
}

export interface FashionTaxonomy {
    version: string;
    categories: { value: FashionCategory; label: string }[];
    groups: { key: TagGroup; source: keyof FashionAnalysis['groups']; label: string; labels: string[] }[];
    aliases: Partial<Record<TagGroup, Record<string, string>>>;
    maxImages: number;
}
// Python 서버가 꺼져 있어도 저장된 태그는 확인/수정할 수 있게 하는 최소 표시 정보입니다.
export const FALLBACK_TAXONOMY: FashionTaxonomy = {
    version: 'fallback', maxImages: 3, aliases: {},
    categories: [{value:'AUTO',label:'자동 분류'}, {value:'TOP',label:'상의'}, {value:'BOTTOM',label:'하의'}, {value:'DRESS',label:'원피스'}, {value:'OUTER',label:'아우터'}, {value:'SHOES',label:'신발'}, {value:'BAG',label:'가방'}, {value:'ACCESSORY',label:'액세서리'}],
    groups: [{key:'type',source:'productType',label:'상품 종류',labels:[]}, {key:'pattern',source:'pattern',label:'패턴',labels:[]}, {key:'style',source:'style',label:'스타일',labels:[]}, {key:'knit',source:'knitTexture',label:'니트 짜임',labels:[]}],
};
export async function getFashionTaxonomy(signal?: AbortSignal): Promise<FashionTaxonomy> {
    return read(await apiFetch(`${BASE}/taxonomy`, {signal, cache:'no-store'}));
}
export async function getFashionTagStatus(pno: number): Promise<{ count: number }> {
    return read(await apiFetch(`${BASE}/products/${pno}/tags/status`, {cache:'no-store'}));
}
// 일괄 분석은 기존 태그가 하나라도 있으면 저장하지 않습니다. 서버에서 원자적으로 확인합니다.
export async function saveFashionTagsIfEmpty(pno: number, tags: FashionTag[]): Promise<FashionTag[]> {
    return read(await apiFetch(`${BASE}/products/${pno}/tags/if-empty`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(tags)}));
}
export async function readFashionImage(imageUrl: string, signal?: AbortSignal): Promise<File> {
    const { getImageUrl } = await import('../ts/imageUrl');
    const url = getImageUrl(imageUrl);
    const apiOrigin = new URL(import.meta.env.VITE_API_BASE_URL || 'http://localhost:9101').origin;
    const response = await fetch(url, {signal, cache:'no-store', credentials:new URL(url, window.location.href).origin === apiOrigin ? 'include' : 'same-origin'});
    if (!response.ok) throw new Error('상품 이미지를 읽을 수 없습니다. 이미지 주소와 CORS 설정을 확인해주세요.');
    const blob = await response.blob();
    if (blob.size > 10 * 1024 * 1024) throw new Error('이미지는 한 장당 최대 10MB입니다.');
    return new File([blob], 'product-image', {type:blob.type});
}
export function suggestFashionTags(result: FashionAnalysis): FashionTag[] {
    return FALLBACK_TAXONOMY.groups.flatMap(group => {
        const best = result.groups[group.source]?.find(candidate => candidate.score >= 0);
        return best ? [{group:group.key, label:best.label, score:best.score}] : [];
    });
}
