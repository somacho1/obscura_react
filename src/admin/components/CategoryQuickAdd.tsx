import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createCategory } from '../../api/categoryApi';
import type { CategoryResponse } from '../../ts/category';
import './AdminCatalog.css';

// 상품 작성값을 유지한 채 카테고리를 즉시 등록하고 선택합니다. 바깥 상품 form에 중첩 form을 만들지 않습니다.
export default function CategoryQuickAdd({ categories, onCreated }: { categories: CategoryResponse[]; onCreated: (category: CategoryResponse) => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const lock = useRef(false);
    const add = async () => {
        if (lock.current) return;
        const clean = name.trim();
        if (!clean) { setError('카테고리명을 입력해주세요.'); return; }
        if (categories.some(c => c.name.trim().toLowerCase() === clean.toLowerCase())) { setError('이미 등록된 이름입니다. 비활성 항목은 카테고리 관리에서 활성화해주세요.'); return; }
        lock.current = true; setSaving(true); setError('');
        try {
            const created = await createCategory({ name: clean, statusNo: 1, seqNo: Math.max(0, ...categories.map(c => c.seqNo)) + 1 });
            onCreated(created); setName(''); setOpen(false);
        } catch (err) { setError(err instanceof Error ? err.message : '카테고리 등록 실패'); }
        finally { lock.current = false; setSaving(false); }
    };
    return <div className="catalog-quick-add"><div className="catalog-actions"><button type="button" disabled={saving} onClick={() => setOpen(v => !v)}>{open ? '추가 닫기' : '+ 카테고리 추가'}</button><Link to="/admin/categories" target="_blank" rel="noopener noreferrer">카테고리 관리 ↗</Link></div>{open && <div className="catalog-quick-form"><input aria-label="추가할 카테고리명" placeholder="예: WOMEN" value={name} disabled={saving} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void add(); } }} /><button type="button" disabled={saving} onClick={() => void add()}>{saving ? '추가 중…' : '추가하고 선택'}</button></div>}{open && error && <p role="alert" className="catalog-error">{error}</p>}</div>;
}
