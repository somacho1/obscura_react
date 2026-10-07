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

// 무통장입금 신청 요청: 결제금액은 서버에서 주문 정보로 확인합니다.
export interface BankPaymentRequest {
    mno: number;       // 로그인 회원번호
    ordno: number;     // 결제 대기 주문번호
    depositor: string; // 입금자명
}