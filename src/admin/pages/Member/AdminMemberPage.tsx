import { useEffect, useState } from 'react';
import { getAdminMembers, changeMemberRole } from '../../../api/adminMemberApi';
import type { MemberResponse } from '../../../ts/member';
import './AdminMemberPage.css';

export default function AdminMemberPage() {
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [keyword, setKeyword] = useState('');
  const [savingNo, setSavingNo] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void getAdminMembers().then(data => {
      if (!cancelled) setMembers(data);
    }).catch(err => {
      if (!cancelled) setError(err instanceof Error ? err.message : '회원 조회 실패');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const updateRole = async (member: MemberResponse, role: 'USER' | 'ADMIN') => {
    if (role === member.role || savingNo !== null) return;
    // 실제 권한이 변경되므로 대상 계정과 변경 권한을 확인합니다.
    if (!window.confirm(`${member.id} 계정을 ${role === 'ADMIN' ? '관리자' : '일반회원'}로 변경하시겠습니까?`)) return;
    setSavingNo(member.no);
    setError('');
    setNotice('');
    try {
      const updated = await changeMemberRole(member.no, role);
      setMembers(previous => previous.map(item => item.no === updated.no ? updated : item));
      setNotice(`${updated.id} 계정의 권한이 변경되었습니다.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '권한 변경 실패');
    } finally {
      setSavingNo(null);
    }
  };

  const search = keyword.trim().toLowerCase();
  const visible = members.filter(member =>
    [member.id, member.name, member.email].some(value => value.toLowerCase().includes(search)),
  );

  return (
    <section className="admin-members">
      <h1>회원 권한 관리</h1>
      <p>직원별 계정에 관리자 권한을 부여하거나 회수합니다.</p>
      <label className="admin-members-search">
        <span>회원 검색</span>
        <input value={keyword} onChange={event => setKeyword(event.target.value)}
          placeholder="아이디 · 이름 · 이메일" />
      </label>
      {notice && <p role="status">{notice}</p>}
      {error && <div role="alert"><p>{error}</p>
        <button type="button" onClick={() => setReloadKey(value => value + 1)}>목록 새로고침</button>
      </div>}
      {loading ? <p role="status">회원을 불러오는 중입니다.</p> : (
        <div className="admin-members-table-wrap">
          <table>
            <thead><tr><th>번호</th><th>아이디</th><th>이름</th><th>이메일</th><th>상태</th><th>권한</th></tr></thead>
            <tbody>
              {visible.map(member => (
                <tr key={member.no}>
                  <td>{member.no}</td><td>{member.id}</td><td>{member.name}</td><td>{member.email}</td>
                  <td>{['탈퇴', '정상', '정지', '휴면'][member.statusNo] ?? '확인 필요'}</td>
                  <td>
                    {member.role === 'SUPER_ADMIN' ? <strong>최상위 관리자</strong> : (
                      <select value={member.role} disabled={savingNo !== null || member.statusNo !== 1}
                        aria-label={`${member.id} 회원 권한`}
                        onChange={event => void updateRole(member, event.target.value as 'USER' | 'ADMIN')}>
                        <option value="USER">일반회원</option><option value="ADMIN">관리자</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={6}>조회된 회원이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
