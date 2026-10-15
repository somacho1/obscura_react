// 백엔드 CategoryDTO 응답 타입
export interface CategoryResponse {
    no: number;
    name: string;
    statusNo: number;
    seqNo: number;
    cdate: string;
}

// CATEGORY 테이블의 기존 필드만 사용합니다. 추가 테이블은 필요하지 않습니다.
export interface CategoryRequest { name: string; seqNo: number; statusNo: number; }
