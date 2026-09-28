import type { StockCreateRequest, StockResponse } from '../ts/stock';

const STOCK_API_URL = 'http://localhost:9101/api/stocks';

export async function createStock(data: StockCreateRequest): Promise<StockResponse> {
    const response = await fetch(STOCK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `재고 등록 실패: ${response.status}`);
    }

    return response.json();
}