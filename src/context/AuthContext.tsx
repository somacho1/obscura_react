import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

import type { LoginResponse } from '../ts/member';

/**
 * localStorage에 로그인 회원정보를 저장할 때 사용할 key
 */
const LOGIN_MEMBER_KEY = 'obscuraLoginMember';

interface AuthContextType {
    member: LoginResponse | null;
    loginMember: (member: LoginResponse) => void;
    logoutMember: () => void;
}

/**
 * 로그인 정보를 여러 컴포넌트에서 공유하기 위한 Context
 */
const AuthContext =
    createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({
    children,
}: AuthProviderProps) {
    const [member, setMember] =
        useState<LoginResponse | null>(null);

    /**
     * 새로고침해도 로그인 정보가 유지되도록
     * localStorage에서 회원정보를 가져온다.
     */
    useEffect(() => {
        const savedMember =
            localStorage.getItem(LOGIN_MEMBER_KEY);

        if (!savedMember) {
            return;
        }

        try {
            const parsedMember: LoginResponse =
                JSON.parse(savedMember);

            setMember(parsedMember);
        } catch {
            localStorage.removeItem(
                LOGIN_MEMBER_KEY,
            );
        }
    }, []);

    /**
     * 로그인 성공
     */
    const loginMember = (
        loginMemberData: LoginResponse,
    ) => {
        setMember(loginMemberData);

        localStorage.setItem(
            LOGIN_MEMBER_KEY,
            JSON.stringify(loginMemberData),
        );
    };

    /**
     * 로그아웃
     */
    const logoutMember = () => {
        setMember(null);

        localStorage.removeItem(
            LOGIN_MEMBER_KEY,
        );
    };

    return (
        <AuthContext.Provider
            value={{
                member,
                loginMember,
                logoutMember,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

/**
 * 로그인 Context 사용
 */
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            'useAuth는 AuthProvider 내부에서 사용해야 합니다.',
        );
    }

    return context;
}