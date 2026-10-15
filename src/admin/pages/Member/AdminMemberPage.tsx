import { useEffect, useRef, useState } from 'react';
import { getAdminMembers, changeMemberRole } from '../../../api/adminMemberApi';
import type { MemberResponse } from '../../../ts/member';
import './AdminMemberPage.css';
const ROLE_NAME = { USER: '일반회원', ADMIN: '관리자', SUPER_ADMIN: '최상위 관리자' };
const STATUS = ['탈퇴', '정상', '정지', '휴면'];
export default function AdminMemberPage() {
    const [members, setMembers] = useState<MemberResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [keyword, setKeyword] = useState('');
    const [savingNo, setSavingNo] = useState<number | null>(null);
    const [drafts, setDrafts] = useState<Record<number, 'USER' | 'ADMIN'>>({});
    const [reloadKey, setReloadKey] = useState(0);
    const lock = useRef(false);
    const active = useRef(true);
    useEffect(() => {
        active.current = true;
        return () => { active.current = false; };
    }, []);
    useEffect(() => {
        let cancelled = false;
        setLoading(true); setError('');
        getAdminMembers().then(data => {
            if (!cancelled) { setMembers(data); setDrafts({}); }
        }).catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : '회원 조회 실패'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [reloadKey]);
    const updateRole = async (member: MemberResponse) => {
        const role = drafts[member.no];
        if (!role || role === member.role || lock.current || member.statusNo !== 1 || member.role === 'SUPER_ADMIN') return;
        if (!window.confirm(`${member.id} 계정의 권한을 ${ROLE_NAME[member.role]} → ${ROLE_NAME[role]}로 변경하시겠습니까?`)) return;
        lock.current = true; setSavingNo(member.no); setError(''); setNotice('');
        try {
            const updated = await changeMemberRole(member.no, role);
            if (!active.current) return;
            setMembers(previous => previous.map(item => item.no === updated.no ? updated : item));
            setDrafts(previous => { const next = { ...previous }; delete next[member.no]; return next; });
            setNotice(`${updated.id} 계정의 권한을 ${ROLE_NAME[updated.role]}로 변경했습니다.`);
        } catch (err) { if (active.current) setError(err instanceof Error ? err.message : '권한 변경 실패'); }
        finally { lock.current = false; if (active.current) setSavingNo(null); }
    };
    const search = keyword.trim().toLowerCase();
    const visible = members.filter(member => [member.id, member.name, member.email].some(value => value.toLowerCase().includes(search)));
    return <section className="admin-members" aria-busy={loading}>
        <header className="admin-members-heading"><div><p>MEMBER ACCESS</p><h1>회원 권한 관리</h1></div><button type="button" disabled={loading || savingNo !== null} onClick={() => setReloadKey(v => v + 1)}>새로고침</button></header>
        <p className="admin-members-help">권한을 선택한 뒤 적용 버튼을 눌러주세요. 최상위 관리자와 비정상 상태 회원은 변경할 수 없습니다.</p>
        <div className="admin-members-toolbar"><span>전체 <strong>{members.length}</strong>명{search && ` · 검색 ${visible.length}명`}</span><label><span className="admin-members-sr">회원 검색</span><input type="search" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="아이디 · 이름 · 이메일 검색" /></label></div>
        {notice && <p role="status" className="admin-members-success">{notice}</p>}
        {error && <p role="alert" className="admin-members-error">{error}</p>}
        {loading ? <p className="admin-members-empty" role="status">회원 정보를 불러오는 중입니다.</p> : <div className="admin-members-table-wrap"><table><thead><tr><th scope="col">번호</th><th scope="col">계정</th><th scope="col">이름</th><th scope="col">이메일</th><th scope="col">상태</th><th scope="col">현재 권한</th><th scope="col">권한 변경</th></tr></thead><tbody>{visible.map(member => {
            const editable = member.role !== 'SUPER_ADMIN' && member.statusNo === 1;
            const value = drafts[member.no] ?? (member.role === 'ADMIN' ? 'ADMIN' : 'USER');
            return <tr key={member.no}><td className="admin-members-no">{member.no}</td><td><strong>{member.id}</strong></td><td>{member.name}</td><td className="admin-members-email">{member.email}</td><td><span className={`admin-members-status${member.statusNo === 1 ? ' is-normal' : ''}`}>{STATUS[member.statusNo] || '확인 필요'}</span></td><td><span className={`admin-members-role role-${member.role.toLowerCase()}`}>{ROLE_NAME[member.role]}</span></td><td>{editable ? <div className="admin-members-actions"><select aria-label={`${member.id} 변경할 권한`} value={value} disabled={savingNo !== null} onChange={e => setDrafts(previous => ({ ...previous, [member.no]: e.target.value as 'USER' | 'ADMIN' }))}><option value="USER">일반회원</option><option value="ADMIN">관리자</option></select><button type="button" disabled={savingNo !== null || value === member.role} onClick={() => void updateRole(member)}>{savingNo === member.no ? '저장 중…' : '적용'}</button></div> : <span className="admin-members-locked">변경 제한</span>}</td></tr>;
        })}{visible.length === 0 && <tr><td colSpan={7} className="admin-members-empty">조회된 회원이 없습니다.</td></tr>}</tbody></table></div>}
    </section>;
}
