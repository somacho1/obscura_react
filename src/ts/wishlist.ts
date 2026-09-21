export interface WishlistRequest {
    mno: number;
    pno: number;
}

export interface WishlistResponse {
    no: number;
    mno: number;
    pno: number;
    cdate: string;
}

export interface WishlistCheckResponse {
    wishlisted: boolean;
}