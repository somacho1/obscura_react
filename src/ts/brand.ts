export interface BrandResponse {
    no: number;
    name: string;
    logoUrl: string | null;
    visualUrl: string | null;
    detail: string | null;
    statusNo: number;

    // 브랜드 활성 상태와 별도로 관리하는 메인 노출 설정입니다.
    topBrandYn: 'Y' | 'N';
    topSeqNo: number;

    cdate: string;
    productCount: number;
    saleProductCount: number;
}

// 관리자 Top Brands 설정 저장 요청
export interface TopBrandRequest {
    topBrandYn: 'Y' | 'N';
    topSeqNo: number;
}