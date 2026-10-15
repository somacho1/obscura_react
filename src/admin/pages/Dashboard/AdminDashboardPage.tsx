import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminNotices, getOperationsSummary } from '../../../api/adminOrderOperationsApi';
import type { AdminNotice, OperationsSummary, OperationsPage } from '../../../api/adminOrderOperationsApi';
import { NoticeRows, OperationsCards } from '../../components/OrderOperationsUi';
import '../../components/OrderOperations.css';
import './AdminDashboardPage.css';
export default function AdminDashboardPage() {
    const [summary, setSummary] = useState<OperationsSummary | null>(null);
    const [notices, setNotices] = useState<OperationsPage<AdminNotice> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [unread, setUnread] = useState(true);
    const [page, setPage] = useState(1);
    const [updatedAt, setUpdatedAt] = useState<string>('');
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        Promise.all([getOperationsSummary(controller.signal), getAdminNotices(unread, page, 10, controller.signal)])
            .then(([s, n]) => {
                if (controller.signal.aborted) return;
                if (page > Math.max(1, n.totalPages)) { setPage(Math.max(1, n.totalPages)); return; }
                setSummary(s); setNotices(n); setUpdatedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
            }).catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '조회 실패'); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [unread, page, revision]);
    // 최초 화면, 탭 복귀, 30초 간격으로 요청을 확인합니다. 처리 작업은 자동 실행하지 않습니다.
    useEffect(() => {
        const refresh = () => { if (!document.hidden && !error) setRevision(v => v + 1); };
        const timer = window.setInterval(refresh, 30000);
        window.addEventListener('focus', refresh);
        return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
    }, [error]);
    return <section className="order-ops-dashboard" aria-busy={loading}>
        <header className="order-ops-heading"><div><h1>DASHBOARD</h1><p>주문 처리 현황</p></div><div className="order-ops-refresh">{updatedAt && <span>{updatedAt} 기준</span>}<button disabled={loading} onClick={() => setRevision(v => v + 1)}>{loading ? '조회 중…' : '새로고침'}</button></div></header>
        {error && <p role="alert" className="order-ops-error">{error}{summary && ' 이전 조회 결과입니다. 자동 갱신은 일시 중지됐습니다.'}</p>}
        <OperationsCards summary={summary} />
        <p className="order-ops-help">알림 확인과 업무 완료는 별도로 관리됩니다.</p>
        <div className="order-ops-heading order-ops-section"><h2>요청·알림 {summary ? <small>미확인 {summary.unreadNotices}건</small> : null}</h2><Link to="/admin/orders">주문 관리 →</Link></div>
        <div className="order-ops-tabs"><button className={unread ? 'active' : ''} onClick={() => { if (unread) return; setUnread(true); setPage(1); setNotices(null); }}>미확인</button><button className={!unread ? 'active' : ''} onClick={() => { if (!unread) return; setUnread(false); setPage(1); setNotices(null); }}>전체 이력</button></div>
        {notices?.content.length ? <NoticeRows notices={notices.content} /> : <p className="order-ops-empty">{loading ? '요청을 불러오는 중입니다.' : error ? '요청을 조회하지 못했습니다.' : unread ? '미확인 요청이 없습니다.' : '등록된 알림이 없습니다.'}</p>}
        {notices && notices.totalPages > 1 && <nav className="order-ops-pagination" aria-label="알림 페이지"><button disabled={loading || page === 1} onClick={() => setPage(v => v - 1)}>이전</button><span>{page} / {notices.totalPages}</span><button disabled={loading || page >= notices.totalPages} onClick={() => setPage(v => v + 1)}>다음</button></nav>}
    </section>;
}
