// 기존 화면에서 사용하는 상품 데이터 구조
export interface Product {
  id: number;
  brand: string;
  name: string;
  price: number;
  image: string;
  category: 'MEN' | 'WOMEN' | 'SHOES' | 'ACC';

  // 일부 상품에만 존재하는 선택값
  comment?: string;
  discountRate?: number;
  originalPrice?: number;
}

// Spring Boot PRODUCT API에서 받아오는 상품 데이터 구조
export interface ProductResponse {
  no: number;
  bno: number;
  brandName: string;
  cno: number;
  categoryName: string;
  name: string;
  detail: string | null;
  price: number;
  discountRate: number;
  salePrice: number;
  mainImageUrl: string | null;
  statusNo: number;
  cdate: string;
}

// 기존 상품카드에서 사용하는 타입
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

// 백엔드 상품 목록 API 응답 타입
export interface ProductResponse {
    no: number;
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

// 상품 상세페이지 옵션
export interface ProductDetailOption {
    optionNo: number;
    color: string | null;
    sizeValue: string | null;
    soldOut: boolean;
}

// 상품 상세페이지 API 응답
export interface ProductDetailResponse {
    no: number;
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

// 관리자 선택 상품 일괄 할인 요청
export interface ProductBulkDiscountRequest {
    productNos: number[];
    discountRate: number;
}

// 관리자 상품 등록 요청
export interface ProductCreateRequest {
    bno: number;
    cno: number;
    name: string;
    detail: string;
    sizeDetail: string | null;
    price: number;
    discountRate: number;
    statusNo: number;
}