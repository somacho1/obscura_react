import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createCategory, getCategories, updateCategory } from '../../../api/categoryApi';
import type { CategoryResponse } from '../../../ts/category';
import '../../components/AdminCatalog.css';

export default function AdminCategoryPage() {
    const [items, setItems] = useState<CategoryResponse[]>([]);
    const [editing, setEditing] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [seqNo, setSeqNo] = useState('1');
    const [statusNo, setStatusNo] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [revision, setRevision] = useState(0);
    const lock = useRef(false);
    useEffect(() => {
        let cancelled = false; setLoading(true); setError('');
        getCategories().then(data => { if (!cancelled) setItems(data); })
            .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : '조회 실패'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [revision]);
    const reset = () => { setEditing(null); setName(''); setSeqNo(String(Math.max(0, ...items.map(i => i.seqNo)) + 1)); setStatusNo(1); };
    const save = async (event: FormEvent) => {
        event.preventDefault(); if (lock.current || loading) return;
        const clean = name.trim(); const sequence = Number(seqNo);
        if (!clean || !seqNo.trim() || !Number.isSafeInteger(sequence) || sequence < 1 || sequence > 999999999) { setError('이름과 1~999999999 사이의 정수 순서를 입력해주세요.'); return; }
        if (items.some(i => i.no !== editing && i.name.trim().toLowerCase() === clean.toLowerCase())) { setError('이미 등록된 카테고리명입니다.'); return; }
        lock.current = true; setSaving(true); setError(''); setMessage('');
        try {
            const data = { name: clean, seqNo: sequence, statusNo };
            const saved = editing === null ? await createCategory(data) : await updateCategory(editing, data);
            setItems(previous => [...previous.filter(i => i.no !== saved.no), saved]);
            setMessage(editing === null ? '카테고리를 추가했습니다. 상품 등록 화면에서 선택할 수 있습니다.' : '카테고리를 수정했습니다.');
            setEditing(null); setName(''); setSeqNo(String(Math.max(sequence, ...items.map(i => i.seqNo)) + 1)); setStatusNo(1);
        } catch (err) { setError(err instanceof Error ? err.message : '저장 실패'); }
        finally { lock.current = false; setSaving(false); }
    };
    return <section className="admin-catalog">
        <header className="catalog-heading"><div><small>CATEGORIES</small><h1>카테고리 관리</h1><p>MEN, WOMEN, SHOES, ACC 등 필요한 상품 분류를 직접 추가합니다.</p></div><div className="catalog-actions"><Link to="/admin/products">상품 관리</Link><button disabled={loading || saving} onClick={() => setRevision(v => v + 1)}>새로고침</button></div></header>
        <p className="catalog-note">활성 카테고리는 상품 등록·수정 선택 목록에 표시됩니다. 비활성으로 바꿔도 기존 상품의 카테고리 연결은 유지됩니다. 사용자 메뉴 구성은 별도입니다.</p>
        {error && <p className="catalog-error" role="alert">{error}</p>}{message && <p className="catalog-success" role="status">{message}</p>}
        <form className="catalog-box" onSubmit={save}><fieldset disabled={loading || saving}><legend>{editing === null ? '새 카테고리' : `카테고리 #${editing} 수정`}</legend><div className="catalog-grid">
            <label>카테고리명<input aria-label="카테고리명" required value={name} onChange={e => setName(e.target.value)} placeholder="예: WOMEN" /></label>
            <label>정렬 순서<input aria-label="정렬 순서" required type="number" min={1} max={999999999} step={1} value={seqNo} onChange={e => setSeqNo(e.target.value)} /></label>
            {editing !== null && <label>상태<select aria-label="카테고리 상태" value={statusNo} onChange={e => setStatusNo(Number(e.target.value))}><option value={1}>활성</option><option value={0}>비활성</option></select></label>}
        </div><div className="catalog-actions">{editing !== null && <button type="button" onClick={reset}>수정 취소</button>}<button type="submit" className="primary">{saving ? '저장 중…' : editing === null ? '카테고리 추가' : '변경 저장'}</button></div></fieldset></form>
        {loading ? <p role="status">카테고리를 불러오는 중입니다.</p> : <div className="catalog-table-wrap"><table><thead><tr><th>번호</th><th>카테고리명</th><th>순서</th><th>상태</th><th>관리</th></tr></thead><tbody>{[...items].sort((a,b) => a.seqNo - b.seqNo || a.no - b.no).map(i => <tr key={i.no}><td>{i.no}</td><td><strong>{i.name}</strong></td><td>{i.seqNo}</td><td><span className={`catalog-badge ${i.statusNo === 1 ? 'active' : ''}`}>{i.statusNo === 1 ? '활성' : '비활성'}</span></td><td><button disabled={saving} onClick={() => { setEditing(i.no); setName(i.name); setSeqNo(String(i.seqNo)); setStatusNo(i.statusNo); setMessage(''); setError(''); }}>수정</button></td></tr>)}{!items.length && <tr><td colSpan={5} className="catalog-empty">등록된 카테고리가 없습니다.</td></tr>}</tbody></table></div>}
    </section>;
}
