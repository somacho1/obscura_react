// 서버에서 반환하는 메인 배너 정보
export interface MainBannerResponse {
    no: number;
    name: string;
    imageUrl: string | null;
    altText: string | null;
    statusNo: number;
    seqNo: number;
    cdate: string;
}

// 배너 등록·설정 수정 요청
export interface MainBannerRequest {
    name: string;
    altText: string;
    statusNo: number;
    seqNo: number;
}