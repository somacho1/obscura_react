import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getOrderActivity, readOrderNotices } from '../../api/adminOrderOperationsApi';
import type { OrderActivity } from '../../api/adminOrderOperationsApi';
import { operationDate, NoticeStatus } from './OrderOperationsUi';
import './OrderOperations.css';
export default function OrderActivityPanel({ orderNo }: { orderNo: number }) {
    const [params] = useSearchParams();
    const parsedNotice = Number(params.get("notice"));
    const noticeNo = Number.isSafeInteger(parsedNotice) && parsedNotice > 0 ? parsedNotice : undefined;
    const [data, setData] = useState<OrderActivity | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [revision, setRevision] = useState(0);
    const [readRevision, setReadRevision] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        getOrderActivity(orderNo, page, controller.signal, noticeNo).then(async result => {
            if (controller.signal.aborted) return;
            setData(result);
            const ids = result.notices.filter(n => n.readYn === 'N').map(n => n.no);
            // 상세에서 실제로 조회한 요청만 읽음 처리하고 서버 확인자·시간을 다시 조회합니다.
            if (ids.length) {
                await readOrderNotices(orderNo, ids, controller.signal);
                const updated = await getOrderActivity(orderNo, page, controller.signal, noticeNo);
                if (!controller.signal.aborted) setData(updated);
            }
        }).catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '이력 조회 실패'); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [orderNo, page, revision, readRevision, noticeNo]);
    return <section className="order-ops-activity">
        <header className="order-ops-heading"><h2>요청 확인 및 처리 이력</h2><button type="button" disabled={loading} onClick={() => setRevision(v => v + 1)}>새로고침</button></header>
        <p className="order-ops-help">알림 확인은 기록됩니다. 입금·환불 완료는 별도로 처리해주세요.</p>
        {error && <p role="alert" className="order-ops-error">{error}<button type="button" disabled={loading} onClick={() => setReadRevision(v => v + 1)}>다시 확인</button></p>}
        {loading && <p role="status" className="order-ops-empty">조회 중…</p>}
        {data && <>
            <h3>요청 확인 내역</h3>
            {data.notices.length === 0 ? <p className="order-ops-empty">등록된 알림이 없습니다.</p> : <ul className="order-ops-detail-notices">{data.notices.map(n => <li key={n.no}>
                <div><strong>{n.title}</strong><span><NoticeStatus state={n.processState} />{n.amount !== null && <b>{n.amount.toLocaleString('ko-KR')}원</b>}</span></div>
                <small>{n.readYn === 'Y' ? `확인: ${n.readerName || '관리자'} · ${operationDate(n.readDate)}` : '미확인'}</small>
            </li>)}</ul>}
            <h3>처리 이력</h3>
            {data.logs.content.length === 0 ? <p className="order-ops-empty">등록된 처리 이력이 없습니다.</p> : <ol className="order-ops-logs">{data.logs.content.map(log => <li key={log.no}>
                <time>{operationDate(log.cdate)}</time><div><strong>{log.type === 'BASELINE' ? '기존 주문 상태 기록' : log.content}</strong><small>{log.actorType === 'SYSTEM' ? '시스템' : `${log.actorName || '회원'} (${log.actorType})`}{log.refundNo ? ` · 환불 #${log.refundNo}` : ''}{log.amount !== null ? ` · ${log.amount.toLocaleString('ko-KR')}원` : ''}</small></div>
            </li>)}</ol>}
            {data.logs.totalPages > 1 && <nav className="order-ops-pagination" aria-label="처리 이력 페이지"><button disabled={loading || page === 1} onClick={() => setPage(v => v - 1)}>이전</button><span>{page} / {data.logs.totalPages}</span><button disabled={loading || page >= data.logs.totalPages} onClick={() => setPage(v => v + 1)}>다음</button></nav>}
        </>}
    </section>;
}
