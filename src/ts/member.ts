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
    role: 'USER' | 'ADMIN';
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
    role: 'USER' | 'ADMIN';
    statusNo: number;
    cdate: string;
}