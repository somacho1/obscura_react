import type { JoinRequest, LoginRequest, LoginResponse, MemberResponse } from '../ts/member';

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