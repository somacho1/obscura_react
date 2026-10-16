import BatchFashionAiPanel from '../../components/BatchFashionAiPanel';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminProducts } from '../../../api/productApi';
import type { ProductResponse } from '../../../ts/product';
import { getImageUrl } from '../../../ts/imageUrl';
import '../../components/AdminCatalog.css';

export default function AdminProductListPage() {
    const [products, setProducts] = useState<ProductResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const [keyword, setKeyword] = useState('');
    const [brandNo, setBrandNo] = useState('');
    const [categoryNo, setCategoryNo] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    useEffect(() => {
        const controller = new AbortController(); setLoading(true); setError('');
        getAdminProducts(controller.signal).then(data => { if (!controller.signal.aborted) setProducts(data); })
            .catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '조회 실패'); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [revision]);
    const query = keyword.trim().toLowerCase();
    const visible = products.filter(p => (!brandNo || String(p.bno) === brandNo) && (!categoryNo || String(p.cno) === categoryNo) && (!status || String(p.statusNo) === status) && [p.name, p.code, p.brandName].some(value => (value || '').toLowerCase().includes(query))).sort((a, b) => b.no - a.no);
    // 기존 전체 조회 API를 재사용합니다. 데이터가 많아지면 관리자 서버 페이징으로 전환할 수 있습니다.
    const totalPages = Math.max(1, Math.ceil(visible.length / 20));
    const current = Math.min(page, totalPages);
    const pageProducts = visible.slice((current - 1) * 20, current * 20);
    function selectProduct(no: number, checked: boolean) { setSelected(previous => {const next=new Set(previous);if(checked)next.add(no);else next.delete(no);return next;}); }
    return <section className="admin-catalog">
        <header className="catalog-heading"><div><small>PRODUCTS</small><h1>상품 관리</h1><p>판매 상태와 분류를 확인하고 상품을 등록·수정합니다.</p></div><div className="catalog-actions"><Link to="/admin/categories">카테고리 관리</Link><Link className="primary" to="/admin/products/create">상품 등록</Link></div></header>
        <div className="catalog-toolbar"><input aria-label="상품 검색" type="search" placeholder="상품명 · CODE · 브랜드 검색" value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1); }} />
            <select aria-label="브랜드 필터" value={brandNo} onChange={e => { setBrandNo(e.target.value); setPage(1); }}><option value="">전체 브랜드</option>{Array.from(new Map(products.map(p => [p.bno, p.brandName])).entries()).map(([no, name]) => <option key={no} value={no}>{name}</option>)}</select>
            <select aria-label="카테고리 필터" value={categoryNo} onChange={e => { setCategoryNo(e.target.value); setPage(1); }}><option value="">전체 카테고리</option>{Array.from(new Map(products.map(p => [p.cno, p.categoryName])).entries()).map(([no, name]) => <option key={no} value={no}>{name}</option>)}</select>
            <select aria-label="판매 상태 필터" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">전체 상태</option><option value="1">판매 중</option><option value="0">판매 중지</option></select><button disabled={loading} onClick={() => setRevision(v => v + 1)}>새로고침</button></div>
        {error && <p className="catalog-error" role="alert">{error}</p>}
        <p className="catalog-count">전체 {products.length}개 · 검색 {visible.length}개</p>
        <BatchFashionAiPanel products={products.filter(product => selected.has(product.no))} />
        {loading ? <p role="status">상품을 불러오는 중입니다.</p> : <div className="catalog-table-wrap"><table><thead><tr><th><input type="checkbox" aria-label="현재 페이지 전체 선택" checked={pageProducts.length>0&&pageProducts.every(product=>selected.has(product.no))} onChange={e=>{const checked=e.target.checked;setSelected(previous=>{const next=new Set(previous);pageProducts.forEach(product=>{if(checked)next.add(product.no);else next.delete(product.no);});return next;});}}/></th><th>번호</th><th>상품</th><th>브랜드 / 카테고리</th><th>판매가</th><th>상태</th><th>관리</th></tr></thead><tbody>
            {pageProducts.map(p => <tr key={p.no}><td><input type="checkbox" aria-label={`${p.name} 선택`} checked={selected.has(p.no)} onChange={e=>selectProduct(p.no,e.target.checked)}/></td><td>{p.no}</td><td><div className="catalog-product">{p.mainImageUrl ? <img src={getImageUrl(p.mainImageUrl)} alt="" /> : <span className="catalog-no-image">이미지 없음</span>}<div><strong>{p.name}</strong><small>{p.code || 'CODE 미등록'}</small></div></div></td><td>{p.brandName}<small className="catalog-muted">{p.categoryName}</small></td><td>{p.salePrice.toLocaleString('ko-KR')}원{p.discountRate > 0 && <small className="catalog-muted">{p.discountRate}% 할인</small>}</td><td><span className={`catalog-badge ${p.statusNo === 1 ? 'active' : ''}`}>{p.statusNo === 1 ? '판매 중' : '판매 중지'}</span></td><td><Link to={`/admin/products/${p.no}/edit`}>수정 · 옵션/재고</Link></td></tr>)}
            {!visible.length && <tr><td colSpan={7} className="catalog-empty">{error ? '상품을 조회하지 못했습니다.' : '조건에 맞는 상품이 없습니다.'}</td></tr>}
        </tbody></table></div>}
        {totalPages > 1 && <nav className="catalog-pagination" aria-label="상품 페이지"><button disabled={current === 1} onClick={() => setPage(current - 1)}>이전</button><span>{current} / {totalPages}</span><button disabled={current === totalPages} onClick={() => setPage(current + 1)}>다음</button></nav>}
    </section>;
}
