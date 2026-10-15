import { useEffect, useRef, useState } from 'react';
import type { OrderResponse } from '../../ts/order';
import { createRefund, executeRefund, getRefundState, newRefundKey, RefundApiError } from '../../api/refundApi';
import type { RefundInfo, RefundRequest, RefundState } from '../../api/refundApi';
import BankRefundPanel from './BankRefundPanel';
import './RefundPanel.css';

interface Props {
    order: OrderResponse; method: string; admin?: boolean; disabled?: boolean;
    onUpdated: () => void; onBusyChange?: (busy: boolean) => void;
    onHistoryChange?: (hasHistory: boolean) => void;
}
// 동일 요청을 재시도할 때에는 최초 요청의 키와 내용을 그대로 사용합니다.
export default function RefundPanel({ order, method, admin = false, disabled = false,
    onUpdated, onBusyChange, onHistoryChange }: Props) {
    const [state, setState] = useState<RefundState | null>(null);
    const [qty, setQty] = useState<Record<number, number>>({});
    const [reason, setReason] = useState('');
    const [bank, setBank] = useState('');
    const [account, setAccount] = useState('');
    const [holder, setHolder] = useState('');
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const lock = useRef(false);
    const submitted = useRef<RefundRequest | null>(null);
    const active = useRef(true);
    const historyCallback = useRef(onHistoryChange);
    historyCallback.current = onHistoryChange;
    useEffect(() => {
        active.current = true;
        let current = true;
        setLoading(true);
        getRefundState(order.no, admin).then(data => {
            if (!current) return;
            setState(data);
            historyCallback.current?.(data.history.length > 0);
        }).catch((err: unknown) => {
            if (current) setError(err instanceof Error ? err.message : '환불정보 조회 실패');
        }).finally(() => { if (current) setLoading(false); });
        return () => { current = false; active.current = false; };
    }, [order.no, admin, reload]);
    const pending = state?.history.find(item => item.statusNo === 0);
    const allRemaining = order.items.some(item => item.qty > item.cancelQty)
        && order.items.every(item => (qty[item.no] || 0) === item.qty - item.cancelQty);
    // 화면 금액은 안내용이며 실제 환불 금액은 서버가 계산합니다.
    const amount = order.items.reduce((sum, item) => sum + item.price * (qty[item.no] || 0), 0)
        + (allRemaining ? order.shippingFee : 0);
    const canRequest = !admin && state && state.balanceAmount > 0 && !pending
        && [2, 3].includes(order.statusNo) && [0, 1].includes(order.cancelStatusNo);
    const legacy = state && state.history.length === 0 && method === 'BANK'
        && [2, 3].includes(order.cancelStatusNo);

    async function run(info?: RefundInfo) {
        if (lock.current || disabled || !state) return;
        if (!info && !submitted.current) {
            const chosen = order.items.filter(item => (qty[item.no] || 0) > 0)
                .map(item => ({ itemNo: item.no, qty: qty[item.no] }));
            if (!chosen.length || !reason.trim()) { setError('상품 수량과 환불 사유를 입력해주세요.'); return; }
            if (new TextEncoder().encode(reason.trim()).length > 200) { setError('환불 사유는 200바이트 이내로 입력해주세요.'); return; }
            if (method === 'BANK' && (!bank.trim() || !holder.trim() || !/^\d{6,30}$/.test(account.replace(/[\s-]/g, '')))) {
                setError('은행·계좌번호·예금주를 확인해주세요.'); return;
            }
            if (!window.confirm(`${amount.toLocaleString('ko-KR')}원 환불을 요청하시겠습니까?`)) return;
            submitted.current = { requestKey: newRefundKey(), reason: reason.trim(), bank: bank.trim(),
                account: account.replace(/[\s-]/g, ''), holder: holder.trim(), items: chosen };
        }
        if (admin && info && !window.confirm(
            `${info.amount.toLocaleString('ko-KR')}원\n${info.bank} / ${info.account} / ${info.holder}\n\n실제 송금을 완료하셨습니까? 완료 처리하면 선택 수량의 재고가 복구됩니다.`)) return;
        lock.current = true;
        setBusy(true); onBusyChange?.(true); setError('');
        let completed = false;
        let created = false;
        try {
            let result = info ?? await createRefund(order.no, submitted.current!);
            created = true;
            if (result.orderNo !== order.no) throw new Error('환불 주문이 일치하지 않습니다.');
            if (result.method === 'TOSS' || admin) result = await executeRefund(result.no, admin);
            if (active.current) {
                const updated = await getRefundState(order.no, admin);
                setState(updated);
                historyCallback.current?.(updated.history.length > 0);
                submitted.current = null;
                setQty({});
                completed = true;
            }
        } catch (err) {
            if (!info && !created && err instanceof RefundApiError && err.status === 400) submitted.current = null;
            if (active.current) {
                setError(err instanceof Error ? err.message : '환불 처리에 실패했습니다.');
                // 접수 후 응답이 유실돼도 저장된 요청을 조회해 동일 요청으로 재시도합니다.
                try {
                    const updated = await getRefundState(order.no, admin);
                    if (active.current) {
                        setState(updated);
                        historyCallback.current?.(updated.history.length > 0);
                    }
                } catch { /* 조회 실패 시 최초 요청키와 내용을 유지합니다. */ }
            }
        } finally {
            lock.current = false;
            if (active.current) { setBusy(false); onBusyChange?.(false); }
        }
        if (completed) onUpdated();
    }

    function formatRefundDate(value: string) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return <section className={`refund-panel${admin ? ' refund-panel--admin' : ''}`}>
        <header className="refund-panel__heading">
            <h2>상품 취소·환불</h2>
            <button className="refund-panel__refresh" type="button" disabled={busy || disabled || loading}
                onClick={() => { setError(''); setReload(v => v + 1); }}>새로고침</button>
        </header>
        {loading && <p role="status">환불정보를 불러오는 중입니다.</p>}
        {error && <p role="alert" className="refund-panel__error">{error}</p>}
        {state && <>
            <dl className="refund-panel__amounts">
                <div><dt>누적 환불</dt><dd>{state.refundedAmount.toLocaleString('ko-KR')}원</dd></div>
                <div><dt>남은 결제 금액</dt><dd>{state.balanceAmount.toLocaleString('ko-KR')}원</dd></div>
            </dl>
            {legacy && <BankRefundPanel orderNo={order.no} memberNo={order.mno} admin={admin}
                disabled={disabled || busy} onUpdated={onUpdated} onBusyChange={onBusyChange} />}
            {pending && <div className="refund-panel__pending">
                <div className="refund-panel__pending-heading"><div><span className="refund-panel__eyebrow">환불 요청 #{pending.no}</span><h3>{pending.method === 'BANK' ? '송금 확인이 필요한 환불입니다.' : '카드 취소 결과를 확인해주세요.'}</h3></div><span className="refund-panel__badge">출고 보류</span></div>
                <dl className="refund-panel__request-info">
                    <div><dt>환불 금액</dt><dd className="refund-panel__request-amount">{pending.amount.toLocaleString('ko-KR')}원</dd></div>
                    <div><dt>접수일시</dt><dd>{formatRefundDate(pending.cdate)}</dd></div>
                    <div className="refund-panel__wide"><dt>대상 상품</dt><dd>{pending.items.map(selection => <span key={selection.itemNo}>{order.items.find(item => item.no === selection.itemNo)?.productName || `상품 #${selection.itemNo}`} · {selection.qty}개</span>)}</dd></div>
                    <div className="refund-panel__wide"><dt>환불 사유</dt><dd>{pending.reason}</dd></div>
                    {pending.method === 'BANK' && <><div><dt>환불 은행</dt><dd>{pending.bank}</dd></div><div><dt>예금주</dt><dd>{pending.holder}</dd></div><div className="refund-panel__wide"><dt>환불 계좌</dt><dd>{pending.account}</dd></div></>}
                </dl>
                <div className="refund-panel__pending-footer"><p>{pending.method === 'BANK' ? admin ? '실제 송금이 완료된 경우에만 완료 처리해주세요.' : '관리자가 확인 후 환불을 진행합니다.' : '같은 요청으로 취소 결과를 다시 확인합니다.'}</p>
                    {((admin && pending.method === 'BANK') || (!admin && pending.method === 'TOSS')) && <button className="refund-panel__submit" type="button" disabled={busy || disabled} onClick={() => void run(pending)}>{busy ? '처리 중…' : admin ? '송금 완료 확인' : '환불 결과 다시 확인'}</button>}
                </div>
            </div>}
            {canRequest && <form onSubmit={event => { event.preventDefault(); void run(); }}>
                <div className="refund-panel__notice">
                    <p>취소할 상품의 수량을 입력해주세요.</p>
                    <p>남은 상품 전체 취소 시 배송비도 환불됩니다. 일부 취소 시 배송비는 추가로 청구하지 않습니다.</p>
                </div>
                <fieldset disabled={busy || disabled || !!submitted.current}>
                    {order.items.filter(item => item.qty > item.cancelQty).map(item => <label key={item.no} className="refund-panel__item">
                        <span className="refund-panel__product">
                            <span className="refund-panel__name">{item.productName}</span>
                            <small>COLOR: {item.color || '-'} / SIZE: {item.sizeValue || '-'}</small>
                            <small>남은 수량 {item.qty - item.cancelQty}개 · 단가 {item.price.toLocaleString('ko-KR')}원</small>
                        </span>
                        <span className="refund-panel__quantity"><span>취소 수량</span>
                        <input type="number" min={0} max={item.qty - item.cancelQty} step={1} value={qty[item.no] || 0}
                            aria-label={`${item.productName} 취소 수량`} onChange={event => {
                                const value = Number(event.target.value);
                                if (Number.isSafeInteger(value) && value >= 0 && value <= item.qty - item.cancelQty)
                                    setQty(previous => ({ ...previous, [item.no]: value }));
                            }} />
                        </span>
                    </label>)}
                    <label className="refund-panel__reason">환불 사유<input placeholder="취소 사유를 입력해주세요" value={reason} maxLength={150} required onChange={e => setReason(e.target.value)} /></label>
                    {method === 'BANK' && <div className="refund-panel__bank-fields">
                        <label>은행<input value={bank} maxLength={50} required onChange={e => setBank(e.target.value)} /></label>
                        <label>계좌번호<input value={account} maxLength={40} required onChange={e => setAccount(e.target.value)} /></label>
                        <label>예금주<input value={holder} maxLength={50} required onChange={e => setHolder(e.target.value)} /></label>
                    </div>}
                </fieldset>
                <div className="refund-panel__total"><span>예상 환불 금액</span><strong>{amount.toLocaleString('ko-KR')}원</strong></div>
                <div className="refund-panel__actions">
                    <button className="refund-panel__submit" type="submit" disabled={busy || disabled || amount <= 0}>
                        {busy ? '처리 중…' : submitted.current ? '동일 요청 재시도' : method === 'BANK' ? '선택 상품 환불 접수' : '선택 상품 취소'}
                    </button>
                </div>
            </form>}
            {state.history.length > 0 && <details className="refund-panel__history">
                <summary>환불 이력 <span>{state.history.length}건</span></summary>
                {state.history.map(info => <article key={info.no}>
                    <strong>{info.statusNo === 1 ? '완료' : '대기'} · {info.amount.toLocaleString('ko-KR')}원</strong>
                    <p>{info.reason}</p>
                    <p>{info.items.map(item => `${order.items.find(row => row.no === item.itemNo)?.productName || item.itemNo} ${item.qty}개`).join(', ')}</p>
                    <small>{formatRefundDate(info.completeDate || info.cdate)}</small>
                </article>)}
            </details>}
        </>}
    </section>;
}
