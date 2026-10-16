import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { askChat, type ChatMessage, type ChatProduct } from '../../../api/chatApi';
import { getImageUrl } from '../../../ts/imageUrl';
import { clampChatPosition, type ChatPosition } from '../../../ts/chatWindow';
import './ChatWidget.css';

const STORAGE = 'obscura-chat-v2';
const POSITION_STORAGE = 'obscura-chat-position-v2';
const WELCOME: ChatMessage = { role: 'assistant', content: '안녕하세요. 원하시는 상품이나 궁금한 쇼핑 정보를 말씀해 주세요.' };
const QUICK = ['가장 저렴한 상품', '할인 상품', '미니멀 스타일', '배송·반품 안내'];
const money = (value: number) => `${value.toLocaleString('ko-KR')}원`;
function validProduct(value: unknown): value is ChatProduct {
    if (!value || typeof value !== 'object') return false;
    const p = value as Partial<ChatProduct>;
    return typeof p.no === 'number' && Number.isSafeInteger(p.no) && p.no > 0
        && typeof p.brand === 'string' && typeof p.name === 'string'
        && typeof p.salePrice === 'number' && Number.isFinite(p.salePrice) && p.salePrice >= 0
        && typeof p.price === 'number' && Number.isFinite(p.price)
        && typeof p.discountRate === 'number' && Number.isFinite(p.discountRate)
        && (p.imageUrl === null || typeof p.imageUrl === 'string');
}
function restore(): ChatMessage[] {
    try {
        const value: unknown = JSON.parse(sessionStorage.getItem(STORAGE) || 'null');
        if (Array.isArray(value)) {
            const safe = value.filter((m): m is ChatMessage => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length <= 8000)
                .map(m => ({ ...m, sources: Array.isArray(m.sources) ? m.sources.filter((s: unknown) => typeof s === 'string') : [],
                    products: Array.isArray(m.products) ? m.products.filter(validProduct).slice(0, 3) : [],
                    conditions: typeof m.conditions === 'string' ? m.conditions : '' })).slice(-40);
            if (safe.length) return safe;
        }
    } catch { /* 저장 기능이 차단돼도 상담은 사용할 수 있습니다. */ }
    return [WELCOME];
}
function restorePosition(): ChatPosition | null {
    try {
        const value = JSON.parse(sessionStorage.getItem(POSITION_STORAGE) || 'null');
        if (value && Number.isFinite(value.x) && Number.isFinite(value.y)) return clampChatPosition(value, Math.min(360, window.innerWidth - 24), Math.min(560, window.innerHeight - 100), window.innerWidth, window.innerHeight);
    } catch { /* 기본 위치로 엽니다. */ }
    return null;
}
function ChatProductCard({ product }: { product: ChatProduct }) {
    const [broken, setBroken] = useState(false);
    return <Link className="ob-chat-product" to={`/products/${product.no}`}>
        <span className="ob-chat-product-image">{product.imageUrl && !broken
            ? <img src={getImageUrl(product.imageUrl)} alt="" loading="lazy" onError={() => setBroken(true)} />
            : <span>NO IMAGE</span>}</span>
        <span className="ob-chat-product-info"><small>{product.brand}</small><strong>{product.name}</strong>
            <span className="ob-chat-product-prices">{product.discountRate > 0 && <b>{product.discountRate}%</b>}<span>{money(product.salePrice)}</span></span>
            {product.discountRate > 0 && <del>{money(product.price)}</del>}
        </span><span className="ob-chat-product-arrow" aria-hidden="true">↗</span>
    </Link>;
}
export default function ChatWidget() {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'home' | 'chat'>('home');
    const viewRef = useRef<'home' | 'chat'>('home');
    const [messages, setMessages] = useState<ChatMessage[]>(restore);
    const [question, setQuestion] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [unread, setUnread] = useState(false);
    const [position, setPosition] = useState<ChatPosition | null>(restorePosition);
    const [dragging, setDragging] = useState(false);
    const drag = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);
    const panel = useRef<HTMLElement>(null);
    const lock = useRef(false);
    const openRef = useRef(false);
    const alive = useRef(true);
    const abort = useRef<AbortController | null>(null);
    const input = useRef<HTMLTextAreaElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const bottom = useRef<HTMLDivElement>(null);
    useEffect(() => { alive.current = true; return () => { alive.current = false; abort.current?.abort(); }; }, []);
    useEffect(() => { try { sessionStorage.setItem(STORAGE, JSON.stringify(messages.slice(-40))); } catch { /* 메모리 상태로 동작합니다. */ } }, [messages]);
    useEffect(() => { try { if (position) sessionStorage.setItem(POSITION_STORAGE, JSON.stringify(position)); else sessionStorage.removeItem(POSITION_STORAGE); } catch { /* 위치 저장은 선택 기능입니다. */ } }, [position]);
    useEffect(() => { if (open) bottom.current?.scrollIntoView({ block: 'nearest' }); }, [open, messages, busy, view]);
    useEffect(() => { if (open && view === 'chat') input.current?.focus(); }, [open, view]);
    useEffect(() => {
        const resize = () => setPosition(current => {
            if (!current) return null;
            return clampChatPosition(current, Math.min(360, window.innerWidth - 24), Math.min(560, window.innerHeight - 100), window.innerWidth, window.innerHeight);
        });
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);
    const changeView = (value: 'home' | 'chat') => { viewRef.current = value; setView(value); if (value === 'chat') setUnread(false); };
    const toggle = (value: boolean) => { openRef.current = value; setOpen(value); if (value && viewRef.current === 'chat') setUnread(false); else if (!value) trigger.current?.focus(); };
    const clamp = (value: ChatPosition) => {
        const rect = panel.current?.getBoundingClientRect();
        return clampChatPosition(value, rect?.width ?? 360, rect?.height ?? 560, window.innerWidth, window.innerHeight);
    };
    const startDrag = (e: ReactPointerEvent<HTMLElement>) => {
        if (window.innerWidth <= 768 || e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
        const rect = panel.current?.getBoundingClientRect();
        if (!rect) return;
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
        e.currentTarget.setPointerCapture(e.pointerId); setDragging(true);
    };
    const moveDrag = (e: ReactPointerEvent<HTMLElement>) => {
        const start = drag.current;
        if (start?.id !== e.pointerId) return;
        setPosition(clamp({ x: start.left + e.clientX - start.x, y: start.top + e.clientY - start.y }));
    };
    const endDrag = () => { drag.current = null; setDragging(false); };
    const send = async (text: string) => {
        const value = text.trim();
        if (!value || value.length > 500 || lock.current) return;
        changeView('chat');
        lock.current = true; setBusy(true); setError(''); setQuestion('');
        // 과거 상품 목록/검색 조건도 텍스트 문맥으로 전달하여 ‘그중 할인 상품’ 같은 후속 질문을 해석합니다.
        const history = messages.map(message => ({ ...message, content: message.content + (message.conditions ? `\n[당시 검색 조건: ${message.conditions}]` : '') }));
        setMessages(previous => [...previous, { role: 'user' as const, content: value }].slice(-40));
        const controller = new AbortController(); abort.current = controller;
        const timeout = window.setTimeout(() => controller.abort(), 110000);
        try {
            const result = await askChat(value, history, controller.signal);
            if (!alive.current) return;
            setMessages(previous => [...previous, { role: 'assistant' as const, content: result.answer, sources: result.sources,
                products: result.products || [], conditions: result.conditions || '', mode: result.mode }].slice(-40));
            if (!openRef.current || viewRef.current !== 'chat') setUnread(true);
        } catch (err) {
            if (alive.current) {
                setError(err instanceof Error && err.name !== 'AbortError' ? err.message : '답변이 지연되고 있습니다. 잠시 후 다시 전송해 주세요.');
                setQuestion(value); setMessages(previous => previous.slice(0, -1));
                if (!openRef.current || viewRef.current !== 'chat') setUnread(true);
            }
        } finally {
            window.clearTimeout(timeout); lock.current = false;
            if (alive.current) { setBusy(false); if (openRef.current) window.setTimeout(() => input.current?.focus(), 0); }
        }
    };
    return <>
        <button ref={trigger} className="ob-chat-trigger" type="button" aria-label={open ? '상담창 닫기' : '상담창 열기'} aria-expanded={open} aria-controls="ob-chat-panel" onClick={() => toggle(!open)}>
            {open ? <span className="ob-chat-trigger-close" aria-hidden="true">×</span> : <><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20.5 11.3a8.5 8.5 0 0 1-8.5 8.5H5l-3 2V11.3a9.25 9.25 0 0 1 18.5 0Z"/><path d="M7 9h9M7 13h6"/></svg><span>obscura</span></>} {unread && <span className="ob-chat-badge">새 알림</span>}
        </button>
        {open && <section ref={panel} id="ob-chat-panel" className={`ob-chat${dragging ? ' is-dragging' : ''}`} role="dialog" aria-label="OBSCURA 쇼핑 상담"
            style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
            onKeyDown={e => { if (e.key === 'Escape') toggle(false); }}>
            <header className="ob-chat-header" tabIndex={0} aria-label="상담창 이동: 마우스로 드래그하거나 방향키 사용"
                onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
                onKeyDown={e => {
                    if (e.target !== e.currentTarget || window.innerWidth <= 768 || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
                    const rect = panel.current?.getBoundingClientRect(); if (!rect) return;
                    e.preventDefault(); const step = e.shiftKey ? 50 : 20;
                    setPosition(clamp({ x: rect.left + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0), y: rect.top + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0) }));
                }}>
                <div className="ob-chat-heading"><strong>obscura</strong></div>
                <div className="ob-chat-header-actions"><button type="button" aria-label="상담창 기본 위치로 복원" title="기본 위치로" onClick={() => setPosition(null)}>↙</button><button type="button" aria-label="상담창 닫기" onClick={() => toggle(false)}>×</button></div>
            </header>
            {view === 'home' ? <div className="ob-chat-home">
                <div className="ob-chat-welcome-card">
                    <h2>무엇을 도와드릴까요?</h2>
                    <p>상품 추천부터 배송 안내까지<br />편하게 물어보세요.</p>
                    <button type="button" className="ob-chat-start" onClick={() => changeView('chat')}>문의하기 <span aria-hidden="true">↗</span></button>
                    <small>AI 쇼핑 상담</small>
                </div>
                <div className="ob-chat-home-topics"><h3>바로 찾아보기</h3><div>
                    {['가장 저렴한 상품', '할인율 높은 상품', '미니멀 스타일', '배송·반품 안내'].map((text, index) => <button type="button" key={text} disabled={busy} onClick={() => void send(text)}><span>{['가격별 상품', '할인 상품', '스타일 추천', '쇼핑 안내'][index]}</span><span aria-hidden="true">↗</span></button>)}
                </div></div>
                <a className="ob-chat-home-contact" href="mailto:cs@obscura-store.com?subject=OBSCURA%20Q%26A"><span>다른 방법으로 문의</span><strong>이메일 문의 ↗</strong></a>
            </div> : <>
            <div className="ob-chat-tools"><span>쇼핑 문의</span><button type="button" disabled={busy} onClick={() => { setMessages([WELCOME]); setError(''); setQuestion(''); }}>새 대화</button></div>
            {/* 첫 질문을 쉽게 고르도록 상단에 배치하고 대화가 시작되면 접습니다. */}
            <details className="ob-chat-question-menu" open={messages.length <= 1}>
                <summary>이런 질문을 해보세요</summary>
                <div className="ob-chat-quick" aria-label="빠른 질문">{QUICK.map(text => <button type="button" key={text} disabled={busy} onClick={() => void send(text)}>{text}<span aria-hidden="true">↗</span></button>)}</div>
            </details>
            <div className="ob-chat-log" role="log" aria-live="polite" aria-relevant="additions" aria-busy={busy}>
                {messages.map((message, index) => <div key={index} className={`ob-chat-message is-${message.role}`}>
                    <div className="ob-chat-bubble"><p>{message.content}</p>
                        {!!message.products?.length && <div className="ob-chat-products">{message.products.map(product => <ChatProductCard key={product.no} product={product} />)}</div>}
                        {(message.conditions || !!message.sources?.length) && <details className="ob-chat-evidence"><summary>검색 조건 · 답변 근거</summary>
                            {message.conditions && <p>{message.conditions}</p>}
                            {!!message.sources?.length && <small>{message.sources.join(' / ')}</small>}
                        </details>}
                    </div>
                </div>)}
                {busy && <div className="ob-chat-wait" role="status"><span /><span /><span /><small>질문을 확인하고 있습니다</small></div>}<div ref={bottom} />
            </div>
            {error && <p className="ob-chat-error" role="alert">{error}</p>}
            <form className="ob-chat-form" onSubmit={e => { e.preventDefault(); void send(question); }}>
                <label className="ob-chat-sr" htmlFor="ob-chat-input">상담 질문</label>
                <textarea ref={input} id="ob-chat-input" value={question} maxLength={500} rows={2} disabled={busy} placeholder="예: 10만 원 이하 미니멀한 상품 찾아줘"
                    onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(question); } }} />
                <button type="submit" aria-label="질문 전송" disabled={busy || !question.trim()}>전송</button>
            </form>
            <footer className="ob-chat-links"><Link to="/mypage/orders">주문내역</Link><a href="mailto:cs@obscura-store.com?subject=OBSCURA%20Q%26A">이메일 문의 ↗</a><span>개인정보 입력 금지</span></footer>
            </>}
            <nav className="ob-chat-bottom-nav" aria-label="상담창 메뉴">
                <button type="button" aria-current={view === 'home' ? 'page' : undefined} onClick={() => changeView('home')}><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m3 10 9-7 9 7v11h-7v-7h-4v7H3Z" /></svg><span>홈</span></button>
                <button type="button" aria-current={view === 'chat' ? 'page' : undefined} onClick={() => changeView('chat')}><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M21 11a9 9 0 0 1-9 9H5l-3 2V11a9.5 9.5 0 0 1 19 0Z" /><path d="M7 10h9M7 14h5" /></svg><span>대화{unread ? ' · 새 답변' : busy ? ' · 답변 중' : ''}</span></button>
            </nav>
        </section>}
    </>;
}
