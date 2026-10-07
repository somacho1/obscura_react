// Toss 인증 성공 후 백엔드에 보내는 승인 요청입니다.
// 백엔드에서 회원·주문·금액을 확인한 뒤 실제 승인을 요청합니다.
export interface TossConfirmRequest {
    mno: number;
    paymentKey: string;
    orderId: string;
    amount: number;
}

// 백엔드 PaymentDTO의 응답 구조입니다.
export interface PaymentResponse {
    no: number;
    ordno: number;
    method: 'TOSS' | 'BANK';
    amount: number;
    statusNo: number; // 0 대기 / 1 완료 / 2 부분취소 / 3 전체취소 / 4 실패
    paymentKey: string | null;
    depositor: string | null;
    approveDate: string | null;
    cancelDate: string | null;
    cdate: string;
}