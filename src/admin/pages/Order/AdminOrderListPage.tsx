import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getOperationsOrders, getOperationsSummary } from '../../../api/adminOrderOperationsApi';
import type { OperationsOrder, OperationsPage, OperationsSummary, OrderFilter } from '../../../api/adminOrderOperationsApi';
import { OperationsCards, operationDate } from '../../components/OrderOperationsUi';
import '../../components/OrderOperations.css';
import './AdminOrderListPage.css';
const FILTERS: { value: OrderFilter; label: string }[] = [{ value: 'ALL', label: '전체' }, { value: 'BANK', label: '입금 대기' }, { value: 'SHIPPING', label: '출고 대기' }, { value: 'REFUND', label: '환불 대기' }, { value: 'CHECK', label: '확인 필요' }];
const STATUS: Record<number, string> = { 0: '주문 취소', 1: '결제 대기', 2: '결제 완료', 3: '상품 준비', 4: '배송 중', 5: '배송 완료' };
const PAYMENT: Record<number, string> = { 0: '결제 대기', 1: '결제 완료', 2: '부분취소', 3: '전체취소', 4: '결제 실패' };
export default function AdminOrderListPage() {
    const [params, setParams] = useSearchParams();
    const raw = params.get('filter') || 'ALL';
    const filter: OrderFilter = [...FILTERS.map(f => f.value), 'UNREAD'].includes(raw) ? raw as OrderFilter : 'ALL';
    const unread = params.get('unread') === 'true' || filter === 'UNREAD';
    const parsed = Number(params.get('page') || 1);
    const page = Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 1000000 ? parsed : 1;
    const [result, setResult] = useState<OperationsPage<OperationsOrder> | null>(null);
    const [summary, setSummary] = useState<OperationsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError(''); setResult(null);
        Promise.all([getOperationsOrders(filter, unread, page, controller.signal), getOperationsSummary(controller.signal)])
            .then(([r, s]) => {
                if (controller.signal.aborted) return;
                const last = Math.max(1, r.totalPages);
                if (page > last) { setParams(current => { const next = new URLSearchParams(current); next.set('page', String(last)); return next; }, { replace: true }); return; }
                setResult(r); setSummary(s);
            }).catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '주문 조회 실패'); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [filter, unread, page, revision, setParams]);
    const change = (key: string, value: string) => setParams(current => { const next = new URLSearchParams(current); next.set(key, value); if (key !== 'page') next.set('page', '1'); return next; });
    return <main className="admin-order-list order-ops-orderlist">
        <header className="order-ops-heading"><h1>주문 관리</h1><button disabled={loading} onClick={() => setRevision(v => v + 1)}>새로고침</button></header>
        <OperationsCards summary={summary} />
        <div className="order-ops-filters"><div className="order-ops-tabs">{FILTERS.map(f => <button key={f.value} className={filter === f.value ? 'active' : ''} onClick={() => change('filter', f.value)}>{f.label}</button>)}</div><label><input type="checkbox" checked={unread} onChange={e => { if(filter === 'UNREAD') setParams({ filter: 'ALL', unread: String(e.target.checked), page: '1' }); else change('unread', String(e.target.checked)); }} /> 미확인 요청만</label></div>
        {error && <p role="alert" className="order-ops-error">{error}</p>}
        {loading ? <p className="order-ops-empty" role="status">주문을 불러오는 중입니다.</p> : !result?.content.length ? <p className="order-ops-empty">{error ? '주문을 조회하지 못했습니다.' : '조건에 맞는 주문이 없습니다.'}</p> : <>
            <p className="order-ops-help">조회 결과 {result.totalElements.toLocaleString('ko-KR')}건 · 요청 확인과 실제 처리 완료는 별도입니다.</p>
            <div className="order-ops-table-wrap"><table className="order-ops-table"><thead><tr><th>주문</th><th>주문자·상품</th><th>금액</th><th>결제</th><th>주문·환불</th><th>확인</th><th>관리</th></tr></thead><tbody>{result.content.map(order => <tr key={order.no}>
                <td><strong>#{order.no}</strong><small>{operationDate(order.cdate)}</small></td><td><strong>{order.memberName || `회원 #${order.memberNo}`}</strong><span>{order.productName || '상품 정보 없음'}</span></td><td>{order.totalPrice.toLocaleString('ko-KR')}원</td>
                <td>{order.method === 'BANK' ? '무통장입금' : order.method === 'TOSS' ? '카드·간편결제' : '-'}<small>{order.paymentStatusNo === null ? '결제 신청 전' : PAYMENT[order.paymentStatusNo] || '확인 필요'}</small></td>
                <td>{STATUS[order.statusNo] || '확인 필요'}<small>{order.pendingRefundCount > 0 || order.cancelStatusNo === 3 ? '환불 처리 대기·출고 보류' : order.cancelStatusNo === 1 ? '부분환불 완료' : order.cancelStatusNo === 2 ? '전체취소 완료' : '취소 없음'}</small></td>
                <td>{order.unreadCount ? <b className="order-ops-new">NEW {order.unreadCount}</b> : '확인됨'}</td><td><Link to={`/admin/orders/${order.no}`}>{filter === 'BANK' ? '입금 확인' : filter === 'SHIPPING' ? '출고 관리' : filter === 'REFUND' || filter === 'CHECK' ? '요청 확인' : '상세 관리'} →</Link></td>
            </tr>)}</tbody></table></div>
            {result.totalPages > 1 && <nav className="order-ops-pagination" aria-label="주문 페이지"><button disabled={page === 1} onClick={() => change('page', String(page - 1))}>이전</button><span>{page} / {result.totalPages}</span><button disabled={page >= result.totalPages} onClick={() => change('page', String(page + 1))}>다음</button></nav>}
        </>}
    </main>;
}
