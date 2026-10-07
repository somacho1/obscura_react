// 기존 화면의 상품 카드에서 사용하는 데이터
export interface Product {
    id: number;
    brand: string;
    name: string;
    price: number;
    image: string;
    category: 'MEN' | 'WOMEN' | 'SHOES' | 'ACC';
    comment?: string;
    discountRate?: number;
    originalPrice?: number;
}

// Spring Boot 상품 목록·기본 조회 API 응답
export interface ProductResponse {
    no: number;
    code: string;
    bno: number;
    brandName: string;
    cno: number;
    categoryName: string;
    name: string;
    detail: string | null;
    sizeDetail: string | null;
    price: number;
    discountRate: number;
    salePrice: number;
    mainImageUrl: string | null;
    statusNo: number;
    // MD 추천 설정
    mdPickYn: 'Y' | 'N';
    mdSeqNo: number;
    cdate: string;
}

// 상품 상세페이지의 색상·사이즈 옵션
export interface ProductDetailOption {
    optionNo: number;
    color: string | null;
    sizeValue: string | null;
    soldOut: boolean;
}

// 상품 상세페이지 API 응답
export interface ProductDetailResponse {
    no: number;
    code: string; // CODE가 없는 기존 상품은 화면에서 숨깁니다.
    bno: number;
    brandName: string;
    cno: number;
    categoryName: string;
    name: string;
    detail: string | null;
    sizeDetail: string | null;
    price: number;
    discountRate: number;
    salePrice: number;
    mainImageUrl: string | null;
    subImages: string[];
    detailImages: string[];
    options: ProductDetailOption[];
    statusNo: number;
}

// 관리자 선택 상품의 할인율 일괄 변경 요청
export interface ProductBulkDiscountRequest {
    productNos: number[];
    discountRate: number;
}

// 관리자 상품 등록 요청
export interface ProductCreateRequest {
    bno: number;
    cno: number;
    code: string; // 신규 상품 등록 시 필수
    name: string;
    detail: string;
    sizeDetail: string | null;
    price: number;
    discountRate: number;
    statusNo: number;
}

// 최신순·가격순·판매량 기준 인기순
export type ProductSortType = 'LATEST' | 'PRICE_LOW' | 'PRICE_HIGH' | 'POPULAR';

// Spring Boot 상품 페이징 API 응답
export interface ProductPageResponse {
    content: ProductResponse[]; // 현재 페이지의 상품
    totalElements: number;      // 조건에 맞는 전체 상품 수
    totalPages: number;         // 전체 페이지 수
    number: number;             // 서버 페이지 번호: 0부터 시작
    size: number;               // 페이지당 상품 수
    first: boolean;             // 첫 페이지 여부
    last: boolean;              // 마지막 페이지 여부
}

// 상품 목록 조회 조건: 검색·카테고리·정렬·페이징
export interface ProductPageRequest {
    cno?: number;              // 생략하면 전체 카테고리
    saleOnly?: boolean;        // 할인 상품만 조회
    page?: number;             // 요청 페이지: 1부터 시작
    size?: number;             // 기본 24개
    sort?: ProductSortType;
    keyword?: string;          // 상품명·브랜드명·CODE 검색어
}

