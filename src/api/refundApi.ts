import { apiFetch } from './apiFetch';
const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:9101').replace(/\/$/, '');
export interface RefundSelection { itemNo: number; qty: number; }
export interface RefundRequest {
    requestKey: string; reason: string; bank: string; account: string; holder: string;
    items: RefundSelection[];
}
export interface RefundInfo {
    no: number; orderNo: number; requestKey: string; method: string; amount: number;
    beforeAmount: number; reason: string; bank: string | null; account: string | null;
    holder: string | null; statusNo: number; cdate: string; completeDate: string | null;
    items: RefundSelection[];
}
export interface RefundState { refundedAmount: number; balanceAmount: number; history: RefundInfo[]; }
export class RefundApiError extends Error {
    status: number;
    constructor(message: string, status: number) { super(message); this.status = status; }
}
// IP 주소로 접속한 개발 환경에서도 사용 가능한 UUID입니다.
export function newRefundKey(): string {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await apiFetch(`${BASE}/api/refunds${path}`, init);
    if (!response.ok) {
        const text = await response.text();
        let message = text;
        try { const body = JSON.parse(text); message = body.message || body.detail || text; } catch { /* 일반 문자열 오류 */ }
        throw new RefundApiError(message || '환불 처리에 실패했습니다.', response.status);
    }
    return response.json();
}
export function getRefundState(orderNo: number, admin = false) {
    return call<RefundState>(`${admin ? '/admin' : ''}/order/${orderNo}`);
}
export function createRefund(orderNo: number, body: RefundRequest) {
    return call<RefundInfo>(`/order/${orderNo}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
export function executeRefund(no: number, admin = false) {
    return call<RefundInfo>(admin ? `/admin/${no}/complete` : `/${no}/execute`, { method: 'POST' });
}
