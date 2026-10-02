// 백엔드 MemberAddressDTO에 맞춘 회원 배송지 응답입니다.
export interface MemberAddressResponse {
    no: number;
    mno: number;
    addressName: string | null; // 배송지명: 집·회사 등
    receiver: string;           // 받는 사람
    phone: string;
    zipcode: string;
    address1: string;           // 기본주소
    address2: string | null;    // 상세주소
    defaultYn: 'Y' | 'N';
    cdate: string;
}