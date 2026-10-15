import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBrands } from '../../../api/brandApi';
import type { BrandResponse } from '../../../ts/brand';
import './ShopMenu.css';

interface Props { open: boolean; onClose: () => void; onNavigate: () => void; }
const CATEGORIES = ['MEN', 'WOMEN', 'SHOES', 'ACC', 'SALE'];

export default function ShopMenu({ open, onClose, onNavigate }: Props) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [brands, setBrands] = useState<BrandResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    // 네이티브 dialog로 키보드 포커스를 메뉴 안에 유지하고 ESC 닫기를 제공합니다.
    useEffect(() => {
        const element = dialog.current;
        if (!element) return;
        if (open && !element.open) element.showModal();
        if (!open && element.open) element.close();
    }, [open]);
    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [open]);
    useEffect(() => {
        if (!open) return;
        let active = true;
        setLoading(true); setError(''); setBrands([]);
        // Top Brands 노출 여부와 관계없이 모든 활성 브랜드를 표시합니다.
        getBrands().then(items => {
            if (active) setBrands(items.filter(brand => brand.statusNo === 1).sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true, sensitivity: 'base' })));
        }).catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : '브랜드를 불러오지 못했습니다.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [open, retry]);
    return <dialog ref={dialog} id="shop-menu-panel" className="shop-menu-panel" aria-labelledby="shop-menu-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
        <div className="shop-menu-body">
            <div className="shop-menu-heading"><h2 id="shop-menu-title">SHOP</h2><button type="button" aria-label="SHOP 메뉴 닫기" onClick={onClose}>닫기 ×</button></div>
            <nav aria-label="SHOP 전체 및 카테고리" className="shop-menu-categories"><Link className="shop-menu-all" to="/products" onClick={onNavigate}>ALL</Link>{CATEGORIES.map(name => <Link key={name} to={`/products?category=${name}`} className={name === 'SALE' ? 'is-sale' : ''} onClick={onNavigate}>{name}</Link>)}</nav>
            <h3 className="shop-menu-brand-title">BRAND</h3>
            {loading ? <p role="status" className="shop-menu-message">브랜드를 불러오는 중입니다.</p> : error ? <div className="shop-menu-message" role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>다시 조회</button></div> : brands.length === 0 ? <p className="shop-menu-message">등록된 활성 브랜드가 없습니다.</p> : <nav className="shop-menu-brands" aria-label="SHOP 브랜드 목록">{brands.map(brand => <Link key={brand.no} to={`/brands/${brand.no}`} onClick={onNavigate}>{brand.name}</Link>)}</nav>}
        </div>
    </dialog>;
}
