import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getCurrentMember, logout } from '../api/memberApi';
import type { LoginResponse } from '../ts/member';

interface AuthContextType {
  member: LoginResponse | null;
  authLoading: boolean;
  authError: string;
  loginMember: (member: LoginResponse) => void;
  logoutMember: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<LoginResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const requestVersion = useRef(0);

  const refreshMember = async () => {
    const version = ++requestVersion.current;
    setAuthLoading(true);
    setAuthError('');
    try {
      const current = await getCurrentMember();
      if (version === requestVersion.current) setMember(current);
    } catch (err) {
      if (version === requestVersion.current) {
        setMember(null);
        setAuthError(err instanceof Error ? err.message : '로그인 확인에 실패했습니다.');
      }
    } finally {
      if (version === requestVersion.current) setAuthLoading(false);
    }
  };

  useEffect(() => {
    // 이전 localStorage 로그인 값은 신뢰하지 않고 서버 세션을 확인합니다.
    localStorage.removeItem('obscuraLoginMember');
    void refreshMember();
    const refresh = () => { void refreshMember(); };
    window.addEventListener('obscura-auth-refresh', refresh);
    return () => {
      requestVersion.current++;
      window.removeEventListener('obscura-auth-refresh', refresh);
    };
  }, []);

  // 탭으로 돌아오면 DB에서 바뀐 권한을 다시 확인합니다.
  useEffect(() => {
    const onFocus = () => { void refreshMember(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const loginMember = (value: LoginResponse) => {
    requestVersion.current++;
    setMember(value);
    setAuthLoading(false);
    setAuthError('');
  };

  const logoutMember = async () => {
    // 서버 로그아웃이 실패하면 로그인 상태를 유지해 다시 시도할 수 있게 합니다.
    await logout();
    requestVersion.current++;
    setMember(null);
    setAuthLoading(false);
    setAuthError('');
  };

  return (
    <AuthContext.Provider value={{ member, authLoading, authError, loginMember, logoutMember, refreshMember }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth는 AuthProvider 내부에서 사용해야 합니다.');
  return context;
}
