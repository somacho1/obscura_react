import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBrand, updateBrand } from '../../../api/brandApi';
import type { BrandResponse } from '../../../ts/brand';
import TopBrandSettings from './TopBrandSettings';
import '../../components/AdminCatalog.css';

export default function AdminBrandEditPage() {
    const { no } = useParams();
    const [brand, setBrand] = useState<BrandResponse | null>(null);
    const [name, setName] = useState('');
    const [detail, setDetail] = useState('');
    const [statusNo, setStatusNo] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const lock = useRef(false);
    useEffect(() => {
        let cancelled = false;
        setLoading(true); setError(''); setBrand(null); setMessage('');
        const id = Number(no);
        if (!Number.isSafeInteger(id) || id < 1) { setError('올바른 브랜드 번호가 아닙니다.'); setLoading(false); return; }
        getBrand(id).then(data => { if (!cancelled) { setBrand(data); setName(data.name); setDetail(data.detail || ''); setStatusNo(data.statusNo); } })
            .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : '조회 실패'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [no]);
    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!brand || lock.current) return;
        if (!name.trim()) { setError('브랜드명을 입력해주세요.'); return; }
        lock.current = true; setSaving(true); setError(''); setMessage('');
        try { setBrand(await updateBrand(brand.no, { name: name.trim(), detail: detail.trim(), statusNo })); setMessage('브랜드 정보를 저장했습니다.'); }
        catch (err) { setError(err instanceof Error ? err.message : '저장 실패'); }
        finally { lock.current = false; setSaving(false); }
    };
    return <section className="admin-catalog">
        <header className="catalog-heading"><div><small>BRAND EDIT</small><h1>브랜드 수정</h1></div><Link to={brand ? `/admin/brands/${brand.no}` : '/admin/brands'}>돌아가기</Link></header>
        {error && <p className="catalog-error" role="alert">{error}</p>}{message && <p className="catalog-success" role="status">{message}</p>}
        {loading ? <p role="status">브랜드 정보를 불러오는 중입니다.</p> : brand && <>
            <form onSubmit={save} className="catalog-box"><fieldset disabled={saving}><legend>기본 정보</legend>
                <div className="catalog-grid"><label>브랜드명<input required value={name} onChange={e => setName(e.target.value)} /></label><label>상태<select value={statusNo} onChange={e => setStatusNo(Number(e.target.value))}><option value={1}>활성</option><option value={0}>비활성</option></select></label></div>
                <label>브랜드 설명<textarea rows={5} value={detail} onChange={e => setDetail(e.target.value)} /></label>
                <div className="catalog-actions"><button className="primary" type="submit">{saving ? '저장 중…' : '기본 정보 저장'}</button></div>
            </fieldset></form>
            {/* 기본 정보와 이미지 설정은 각각 저장되므로 동시에 수정하지 않습니다. */}
            {!saving && <TopBrandSettings key={brand.no} brand={brand} onSaved={setBrand} />}
        </>}
    </section>;
}
