// 주문 당시 저장된 배송지와 배송 진행 정보를 받습니다.
// 주문 하나에 여러 배송이 있을 수 있으므로 API에서는 배열로 반환합니다.
export interface DeliveryResponse {
    no: number;
    ordno: number;
    madno: number | null;       // 직접 입력 배송지는 null
    receiver: string;
    phone: string;
    zipcode: string;
    address1: string;
    address2: string | null;
    company: string | null;
    trackingNo: string | null;
    statusNo: number;           // 0 배송준비 / 1 배송중 / 2 배송완료
    shipDate: string | null;
    deliveryDate: string | null;
    cdate: string;
}