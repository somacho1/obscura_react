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