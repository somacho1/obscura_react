export interface StockResponse {
    no: number;
    pono: number;
    qty: number;
    udate: string;
}

export interface StockCreateRequest {
    pono: number;
    qty: number;
}