// 배송지 등록·수정 요청
export interface MemberAddressRequest {
    mno: number;
    addressName: string;
    receiver: string;
    phone: string;
    zipcode: string;
    address1: string;
    address2: string;
    defaultYn: 'Y' | 'N';
}

// 배송지 조회 응답
export interface MemberAddressResponse {
    no: number;
    mno: number;
    addressName: string | null;
    receiver: string;
    phone: string;
    zipcode: string;
    address1: string;
    address2: string | null;
    defaultYn: 'Y' | 'N';
    cdate: string;
}