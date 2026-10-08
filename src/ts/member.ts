/**
 * 로그인 요청 데이터
 */
export interface LoginRequest {
    id: string;
    password: string;
}

/**
 * 로그인 성공 후 백엔드에서 전달받는 회원정보
 */
export interface LoginResponse {
    no: number;
    id: string;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}

export interface JoinRequest {
    id: string;
    password: string;
    name: string;
    email: string;
    phone: string;
}

export interface MemberResponse {
    no: number;
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
    statusNo: number;
    cdate: string;
}

// 회원정보 수정 시 변경 가능한 항목만 전달합니다.
export interface MemberUpdateRequest {
    name: string;
    email: string;
    phone: string;
}
