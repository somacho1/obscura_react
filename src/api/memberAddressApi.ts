import type { MemberAddressRequest, MemberAddressResponse } from '../ts/memberAddress';

const MEMBER_ADDRESS_API_URL = 'http://localhost:9101/api/member-addresses';

// 서버에서 전달한 오류 메시지를 화면에 표시합니다.
async function checkResponse(response: Response): Promise<void> {
    if (response.ok) return;

    const text = await response.text();
    let message = `배송지 처리에 실패했습니다. (${response.status})`;

    if (text.trim()) {
        try {
            const data: unknown = JSON.parse(text);
            if (typeof data === 'string') {
                message = data;
            } else if (
                data && typeof data === 'object'
                && 'message' in data && typeof data.message === 'string'
            ) {
                message = data.message;
            }
        } catch {
            message = text;
        }
    }

    throw new Error(message);
}

// 회원별 저장 배송지 조회: 주문서에서도 사용합니다.
export async function getMemberAddresses(memberNo: number): Promise<MemberAddressResponse[]> {
    const response = await fetch(`${MEMBER_ADDRESS_API_URL}/member/${memberNo}`);
    await checkResponse(response);
    return response.json();
}

// 배송지 등록
export async function createMemberAddress(data: MemberAddressRequest): Promise<MemberAddressResponse> {
    const response = await fetch(MEMBER_ADDRESS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    await checkResponse(response);
    return response.json();
}

// 배송지 수정·기본 배송지 설정
export async function updateMemberAddress(
    addressNo: number,
    data: MemberAddressRequest,
): Promise<MemberAddressResponse> {
    const response = await fetch(`${MEMBER_ADDRESS_API_URL}/${addressNo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    await checkResponse(response);
    return response.json();
}

// 배송지 삭제
export async function deleteMemberAddress(addressNo: number): Promise<void> {
    const response = await fetch(`${MEMBER_ADDRESS_API_URL}/${addressNo}`, {
        method: 'DELETE',
    });
    await checkResponse(response);
}