// 주문상품 응답: 상품정보가 변경돼도 구매 당시 이름·옵션·가격을 유지합니다.
export interface OrderItemResponse {
    no: number;
    ordno: number;              // 주문번호
    pono: number;               // 상품 옵션번호
    productName: string;
    color: string | null;
    sizeValue: string | null;
    price: number;             // 주문 당시 할인 적용 단가
    qty: number;
    statusNo: number;
    cancelQty: number;
    cancelReason: string | null;
    cancelDate: string | null;
    cdate: string;
}

// 주문 생성·상세 조회 응답
export interface OrderResponse {
    no: number;
    mno: number;                // 회원번호
    totalPrice: number;         // 서버에서 계산한 상품 합계
    shippingFee: number;        // 주문 당시 배송비
    statusNo: number;
    cancelStatusNo: number;
    cdate: string;
    items: OrderItemResponse[];
}

// 이번 주문에 사용할 배송지: 회원 배송지 목록에 자동 등록하지 않습니다.
export interface OrderDeliveryRequest {
    madno?: number;       // 저장된 배송지 선택 시에만 전달
    receiver: string;
    phone: string;
    zipcode: string;
    address1: string;
    address2: string;
}

// 가격·배송비는 보내지 않고 서버에서 계산합니다.
export interface OrderCreateRequest {
    mno: number;
    cartItemNos: number[];
    delivery: OrderDeliveryRequest;
}

// 관리자 주문 목록 API 응답: 목록과 서버 페이징 정보를 함께 받습니다.
export interface AdminOrderPageResponse {
    content: OrderResponse[]; // 현재 페이지의 주문 목록
    totalElements: number;   // 전체 주문 수
    totalPages: number;      // 전체 페이지 수
    number: number;          // 현재 페이지 번호: 서버 기준 0부터 시작
    size: number;            // 페이지당 주문 수
    numberOfElements: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}