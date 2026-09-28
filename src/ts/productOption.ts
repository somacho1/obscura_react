export interface ProductOptionResponse {
    no: number;
    pno: number;
    color: string | null;
    sizeValue: string | null;
    useYn: string;
    cdate: string;
}

export interface ProductOptionCreateRequest {
    pno: number;
    color: string;
    sizeValue: string;
    useYn: string;
}