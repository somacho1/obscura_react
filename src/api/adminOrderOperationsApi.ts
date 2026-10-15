import { apiFetch } from './apiFetch';
const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:9101').replace(/\/$/, '') + '/api/admin/order-operations';
export type OrderFilter = 'ALL' | 'BANK' | 'SHIPPING' | 'REFUND' | 'CHECK' | 'UNREAD';
export interface OperationsSummary { bankWaiting: number; shippingWaiting: number; refundWaiting: number; checkNeeded: number; unreadNotices: number; }
export interface AdminNotice { no: number; orderNo: number; refundNo: number | null; type: string; title: string; amount: number | null; readYn: 'Y' | 'N'; cdate: string; readDate: string | null; readerName: string | null; processState: string; }
export interface OrderLog { no: number; refundNo: number | null; type: string; content: string; amount: number | null; actorType: string; actorName: string | null; cdate: string; }
export interface OperationsOrder { no: number; memberNo: number; memberName: string | null; cdate: string; totalPrice: number; statusNo: number; cancelStatusNo: number; method: string | null; paymentStatusNo: number | null; productName: string | null; unreadCount: number; pendingRefundCount: number; }
export interface OperationsPage<T> { content: T[]; totalElements: number; totalPages: number; number: number; size: number; }
export interface OrderActivity { notices: AdminNotice[]; logs: OperationsPage<OrderLog>; }
async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await apiFetch(BASE + path, init);
    if (!response.ok) {
        if (response.status === 401) throw new Error('로그인이 만료되었습니다. 다시 로그인해주세요.');
        if (response.status === 403) throw new Error('관리자 권한이 필요합니다.');
        const text = await response.text();
        let message = '주문 운영 정보를 불러오지 못했습니다.';
        try { const value = JSON.parse(text); if (typeof value.message === 'string') message = value.message; } catch { /* HTML 오류는 화면에 그대로 출력하지 않습니다. */ }
        throw new Error(`${message} (${response.status})`);
    }
    return response.json();
}
export const getOperationsSummary = (signal?: AbortSignal) => call<OperationsSummary>('/summary', { signal });
export const getAdminNotices = (unread = false, page = 1, size = 20, signal?: AbortSignal) => call<OperationsPage<AdminNotice>>(`/notices?unread=${unread}&page=${page}&size=${size}`, { signal });
export const getOperationsOrders = (filter: OrderFilter, unread: boolean, page: number, signal?: AbortSignal) => call<OperationsPage<OperationsOrder>>(`/orders?filter=${filter}&unread=${unread}&page=${page}&size=20`, { signal });
export const getOrderActivity = (orderNo: number, page = 1, signal?: AbortSignal, noticeNo?: number) => call<OrderActivity>(`/orders/${orderNo}?page=${page}&size=20${noticeNo ? `&notice=${noticeNo}` : ""}`, { signal });
// 화면에 표시된 알림만 공통 읽음 처리합니다. 실제 결제·환불 상태는 바꾸지 않습니다.
export const readOrderNotices = (orderNo: number, ids: number[], signal?: AbortSignal) => call<{ changed: number }>(`/orders/${orderNo}/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }), signal });
