import type { MemberAddressResponse } from '../ts/memberAddress';

const MEMBER_ADDRESS_API_URL = 'http://localhost:9101/api/member-addresses';

// 로그인 회원의 저장된 배송지를 조회합니다.
// 등록된 배송지가 없으면 빈 배열을 받아 주문서에서 직접 입력하도록 합니다.
export async function getMemberAddresses(memberNo: number): Promise<MemberAddressResponse[]> {
    const response = await fetch(`${MEMBER_ADDRESS_API_URL}/member/${memberNo}`);
    if (!response.ok) throw new Error(`배송지 조회에 실패했습니다. (${response.status})`);
    return response.json();
}