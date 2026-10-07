import type { JoinRequest, LoginRequest, LoginResponse, MemberResponse, MemberUpdateRequest } from '../ts/member';

const MEMBER_API_URL =
    'http://localhost:9101/api/members';


// 회원가입
export async function join(request: JoinRequest): Promise<MemberResponse> {
    const response = await fetch(MEMBER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `회원가입 실패: ${response.status}`);
    }

    return response.json();
}

// 아이디 중복확인
export async function checkMemberId(id: string): Promise<boolean> {
    const response = await fetch(`${MEMBER_API_URL}/check-id?id=${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error('아이디 중복확인에 실패했습니다.');
    return response.json();
}

// 이메일 중복확인
export async function checkMemberEmail(email: string): Promise<boolean> {
    const response = await fetch(`${MEMBER_API_URL}/check-email?email=${encodeURIComponent(email)}`);
    if (!response.ok) throw new Error('이메일 중복확인에 실패했습니다.');
    return response.json();
}

/**
 * 로그인
 */
export async function login(
    request: LoginRequest,
): Promise<LoginResponse> {
    const response = await fetch(
        `${MEMBER_API_URL}/login`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        },
    );

    if (!response.ok) {
        const message = await response.text();

        throw new Error(
            message ||
            `로그인 실패: ${response.status}`,
        );
    }

    return response.json();
}

// 회원 조회·수정 API의 오류 메시지를 처리합니다.
async function checkMemberResponse(response: Response): Promise<void> {
    if (response.ok) return;

    const text = await response.text();
    let message = `회원정보 처리에 실패했습니다. (${response.status})`;

    if (text.trim()) {
        try {
            const data: unknown = JSON.parse(text);
            if (typeof data === 'string') message = data;
            else if (
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

// 로그인 정보에 없는 연락처도 서버에서 가져옵니다.
export async function getMember(memberNo: number): Promise<MemberResponse> {
    const response = await fetch(`${MEMBER_API_URL}/${memberNo}`);
    await checkMemberResponse(response);
    return response.json();
}

// 아이디·권한·회원상태는 수정 요청에 포함하지 않습니다.
export async function updateMember(
    memberNo: number,
    data: MemberUpdateRequest,
): Promise<MemberResponse> {
    const response = await fetch(`${MEMBER_API_URL}/${memberNo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    await checkMemberResponse(response);
    return response.json();
}