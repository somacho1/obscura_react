import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createBrand } from '../../../api/brandApi';
import '../../components/AdminCatalog.css';

export default function AdminBrandCreatePage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [detail, setDetail] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const lock = useRef(false);
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        // 연속 클릭으로 같은 브랜드가 여러 번 등록되는 것을 막습니다.
        if (lock.current) return;
        if (!name.trim()) { setError('브랜드명을 입력해주세요.'); return; }
        lock.current = true; setSaving(true); setError('');
        try {
            const created = await createBrand({ name: name.trim(), detail: detail.trim() });
            // 생성된 번호로 이동한 뒤 기존 이미지 업로드·메인 노출 설정을 사용합니다.
            navigate(`/admin/brands/${created.no}/edit`, { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : '브랜드 등록에 실패했습니다.');
            lock.current = false; setSaving(false);
        }
    };
    return <section className="admin-catalog">
        <header className="catalog-heading"><div><small>NEW BRAND</small><h1>브랜드 등록</h1><p>기본 정보를 등록한 뒤 로고와 대표 이미지를 추가합니다.</p></div><Link to="/admin/brands">브랜드 목록</Link></header>
        {error && <p role="alert" className="catalog-error">{error}</p>}
        <form className="catalog-box" onSubmit={submit}><fieldset disabled={saving}><legend>기본 정보</legend>
            <label>브랜드명<input aria-label="브랜드명" required value={name} onChange={e => setName(e.target.value)} placeholder="예: 032c" autoComplete="off" /></label>
            <label>브랜드 설명<textarea aria-label="브랜드 설명" rows={5} value={detail} onChange={e => setDetail(e.target.value)} placeholder="브랜드 소개를 입력해주세요. (선택)" /></label>
            <p className="catalog-note">신규 브랜드는 활성 상태로 등록되며, Top Brands 메인 노출은 숨김으로 시작합니다. 이미지와 메인 노출은 등록 후 수정 화면에서 설정할 수 있습니다.</p>
            <div className="catalog-actions"><button className="primary" type="submit">{saving ? '등록 중…' : '브랜드 등록'}</button></div>
        </fieldset></form>
    </section>;
}
