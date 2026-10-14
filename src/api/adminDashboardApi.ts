import { apiFetch } from './apiFetch';
import type { OrderResponse } from '../ts/order';
import type { ProductResponse } from '../ts/product';

export interface AdminDashboardResponse {
    brandCount: number; productCount: number; saleProductCount: number;
    todayOrderCount: number; totalOrderCount: number;
    recentOrders: OrderResponse[]; recentProducts: ProductResponse[]; updatedAt: string;
}
// 세션 쿠키를 포함하여 관리자 전용 집계 API를 호출합니다.
export async function getAdminDashboard(signal?: AbortSignal): Promise<AdminDashboardResponse> {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9101';
    const response = await apiFetch(`${base}/api/admin/dashboard`, { signal });
    if (!response.ok) {
        if (response.status === 401) throw new Error('로그인이 만료되었습니다. 다시 로그인해주세요.');
        if (response.status === 403) throw new Error('관리자 권한이 필요합니다.');
        throw new Error(`운영 현황을 불러오지 못했습니다. (${response.status})`);
    }
    return response.json();
}
