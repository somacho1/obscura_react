import { apiFetch } from './apiFetch';
export interface BankRefundInfo {
    orderNo: number;
    amount: number;
    orderStatusNo: number;
    cancelStatusNo: number;
    paymentStatusNo: number;
    reason: string | null;
    bank: string | null;
    account: string | null;
    holder: string | null;
    cancelDate: string | null;
}

export interface BankRefundForm {
    reason: string;
    bank: string;
    account: string;
    holder: string;
}

const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9101'}/api/payments/bank`;

async function readResponse(response: Response): Promise<BankRefundInfo> {
    if (!response.ok) {
        const text = await response.text();
        let message = `환불 처리에 실패했습니다. (${response.status})`;

        if (text.trim()) {
            try {
                const data: unknown = JSON.parse(text);
                if (typeof data === 'string') message = data;
                else if (
                    data && typeof data === 'object'
                    && 'message' in data && typeof data.message === 'string'
                ) {
                    message = data.message;
                }
            } catch {
                message = text;
            }
        }
        throw new Error(message);
    }
    return response.json();
}

export async function getBankRefund(
    orderNo: number,
    memberNo: number,
    admin = false,
): Promise<BankRefundInfo> {
    const url = admin
        ? `${API_URL}/admin/order/${orderNo}/refund`
        : `${API_URL}/order/${orderNo}/refund?mno=${memberNo}`;

    return readResponse(await apiFetch(url));
}

export async function requestBankRefund(
    orderNo: number,
    memberNo: number,
    form: BankRefundForm,
): Promise<BankRefundInfo> {
    return readResponse(await apiFetch(`${API_URL}/order/${orderNo}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, mno: memberNo }),
    }));
}

export async function completeBankRefund(orderNo: number): Promise<BankRefundInfo> {
    return readResponse(await apiFetch(`${API_URL}/admin/order/${orderNo}/refund/complete`, {
        method: 'PUT',
    }));
}
