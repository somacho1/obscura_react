import { Link } from 'react-router-dom';
import type { AdminNotice, OperationsSummary } from '../../api/adminOrderOperationsApi';
import './OrderOperations.css';
export function operationDate(value: string | null): string {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}
export function NoticeStatus({ state }: { state: string }) {
    const tone = state.includes('완료') ? 'done' : state.includes('대기') ? 'waiting' : state.includes('확인 필요') ? 'attention' : 'neutral';
    return <span className={`order-ops-badge order-ops-badge--${tone}`}>{state}</span>;
}
export function OperationsCards({ summary }: { summary: OperationsSummary | null }) {
    const cards = [
        { title: '입금 확인 대기', value: summary?.bankWaiting, filter: 'BANK' },
        { title: '출고 대기', value: summary?.shippingWaiting, filter: 'SHIPPING' },
        { title: '환불 처리 대기', value: summary?.refundWaiting, filter: 'REFUND' },
        { title: '결제·환불 확인 필요', value: summary?.checkNeeded, filter: 'CHECK' },
    ];
    return <div className="order-ops-cards">{cards.map(card => <Link key={card.filter} to={`/admin/orders?filter=${card.filter}`} className={(card.value ?? 0) > 0 && (card.filter === 'REFUND' || card.filter === 'CHECK') ? 'is-accent' : ''}>
        <span>{card.title}<i aria-hidden="true">↗</i></span><strong>{card.value === undefined ? '—' : card.value.toLocaleString('ko-KR')}</strong>
    </Link>)}</div>;
}
export function NoticeRows({ notices }: { notices: AdminNotice[] }) {
    return <ul className="order-ops-notices">{notices.map(notice => <li key={notice.no}><Link to={`/admin/orders/${notice.orderNo}?notice=${notice.no}`}>
        <div><span className="order-ops-meta">주문 #{notice.orderNo}{notice.refundNo ? ` · 환불 #${notice.refundNo}` : ''}{notice.readYn === 'N' && <b className="order-ops-new">NEW</b>}</span>
            <strong>{notice.title}</strong><small>{operationDate(notice.cdate)}</small></div>
        <div className="order-ops-end">{notice.amount !== null && <strong>{notice.amount.toLocaleString('ko-KR')}원</strong>}<NoticeStatus state={notice.processState} /><span className="order-ops-open">요청 보기 →</span></div>
    </Link></li>)}</ul>;
}
