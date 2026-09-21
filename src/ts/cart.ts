export interface AddCartItemRequest {
    mno: number;
    pono: number;
    qty: number;
}

export interface CartItemResponse {
    no: number;
    mno: number;
    cartno: number;
    pono: number;
    qty: number;
    cdate: string;
}

export interface CartItemDetailResponse {
    cartItemNo: number;
    productNo: number;
    optionNo: number;
    brandName: string;
    productName: string;
    mainImageUrl: string | null;
    color: string | null;
    sizeValue: string | null;
    price: number;
    discountRate: number;
    salePrice: number;
    qty: number;
    stockQty: number;
    soldOut: boolean;
}