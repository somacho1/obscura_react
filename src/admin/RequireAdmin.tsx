import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// 새로고침 중에는 서버의 로그인 확인이 끝날 때까지 기다립니다.
export default function RequireAdmin({ superOnly = false }: { superOnly?: boolean }) {
  const { member, authLoading, authError, refreshMember } = useAuth();
  if (authLoading) return <p role="status">로그인 정보를 확인하는 중입니다.</p>;
  if (authError) {
    return (
      <div role="alert">
        <p>{authError}</p>
        <button type="button" onClick={() => void refreshMember()}>다시 시도</button>
      </div>
    );
  }
  if (!member) return <Navigate to="/login" replace />;
  const allowed = member.role === 'SUPER_ADMIN' || (!superOnly && member.role === 'ADMIN');
  if (!allowed) return <Navigate to="/" replace />;
  return <Outlet />;
}
