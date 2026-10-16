import { apiFetch } from './apiFetch';
export interface ChatProduct { no: number; brand: string; name: string; price: number; salePrice: number; discountRate: number; imageUrl: string | null; }
export interface ChatMessage { products?: ChatProduct[]; conditions?: string; mode?: string; role: 'user' | 'assistant'; content: string; sources?: string[]; }
export interface ChatAnswer { answer: string; mode: 'AI' | 'HANDOFF' | 'PRODUCT' | 'PRODUCT_DB'; sources: string[]; products: ChatProduct[]; conditions: string; }
const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:9101').replace(/\/$/, '');
export async function askChat(question: string, history: ChatMessage[], signal: AbortSignal): Promise<ChatAnswer> {
    const response = await apiFetch(`${BASE}/api/chat`, {
        method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
        // 서버에는 최근 10개만 전달합니다. 화면용 출처 정보는 전송하지 않습니다.
        body: JSON.stringify({ question, history: history.slice(-10).map(({ role, content }) => ({ role, content: content.slice(0, 2000) })) }),
    });
    if (!response.ok) {
        let message = response.status === 400 ? '질문 내용을 확인해 주세요. 최대 500자까지 입력할 수 있습니다.' : '상담 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.';
        try { const body = await response.json(); if (typeof body.message === 'string') message = body.message; } catch { /* JSON이 아닌 서버 오류에도 기본 안내를 유지합니다. */ }
        throw new Error(message);
    }
    return response.json();
}
