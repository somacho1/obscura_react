export interface ProductImageResponse {
    no: number;
    pno: number;
    imageUrl: string;
    imageType: 'MAIN' | 'DETAIL';
    displayYn: string;
    seqNo: number;
    cdate: string;
}