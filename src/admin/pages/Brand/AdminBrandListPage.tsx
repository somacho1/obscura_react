import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBrands } from '../../../api/brandApi';
import type { BrandResponse } from '../../../ts/brand';
import './AdminBrandListPage.css';

function AdminBrandListPage() {
    const navigate = useNavigate();
    const [brands, setBrands] = useState<BrandResponse[]>([]);
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadBrands = async () => {
            try {
                setLoading(true);
                setError('');
                const data = await getBrands();
                setBrands(data);
            } catch (error) {
                console.error('브랜드 목록 조회 실패:', error);
                setError('브랜드 정보를 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };

        loadBrands();
    }, []);

    const filteredBrands = useMemo(() => {
        return brands.filter((brand) => {
            const keywordMatched = brand.name.toLowerCase().includes(keyword.trim().toLowerCase());
            const statusMatched = status === 'ALL' || (status === 'ACTIVE' && brand.statusNo === 1) || (status === 'INACTIVE' && brand.statusNo === 0);
            return keywordMatched && statusMatched;
        });
    }, [brands, keyword, status]);

    const totalProducts = brands.reduce((sum, brand) => sum + brand.productCount, 0);
    const totalSaleProducts = brands.reduce((sum, brand) => sum + brand.saleProductCount, 0);

    return (
        <section className="brand-admin">
            <div className="brand-heading">
                <div>
                    <span>ADMIN</span>
                    <h1>BRANDS</h1>
                    <p>브랜드 관리</p>
                </div>
                <button type="button" className="brand-add" onClick={() => navigate('/admin/brands/create')}>+ ADD BRAND</button>
            </div>

            <div className="brand-overview">
                <div>
                    <span>BRANDS</span>
                    <strong>{String(brands.length).padStart(2, '0')}</strong>
                    <p>등록 브랜드</p>
                </div>

                <div>
                    <span>PRODUCTS</span>
                    <strong>{String(totalProducts).padStart(2, '0')}</strong>
                    <p>등록 상품</p>
                </div>

                <div className="brand-overview-sale">
                    <span>ON SALE</span>
                    <strong>{String(totalSaleProducts).padStart(2, '0')}</strong>
                    <p>할인 상품</p>
                </div>
            </div>

            <div className="brand-list-heading">
                <h2>BRAND LIST</h2>
                <span>{String(filteredBrands.length).padStart(2, '0')} BRANDS</span>
            </div>

            <div className="brand-filter">
                <div>
                    <label>SEARCH</label>
                    <input type="text" value={keyword} placeholder="브랜드명 검색" onChange={(e) => setKeyword(e.target.value)} />
                </div>

                <div>
                    <label>STATUS</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="ALL">ALL</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                    </select>
                </div>
            </div>

            <div className="brand-table">
                <div className="brand-table-head">
                    <span>BRAND</span>
                    <span>PRODUCTS</span>
                    <span>ON SALE</span>
                    <span>STATUS</span>
                    <span>MANAGEMENT</span>
                </div>

                {loading && <div className="brand-empty">브랜드 정보를 불러오는 중입니다.</div>}
                {!loading && error && <div className="brand-empty">{error}</div>}

                {!loading && !error && filteredBrands.map((brand) => (
                    <div className="brand-row" key={brand.no}>
                        <button type="button" className="brand-name" onClick={() => navigate(`/admin/brands/${brand.no}`)}>
                            <strong>{brand.name}</strong>
                            <span>{brand.statusNo === 1 ? 'ACTIVE BRAND' : 'INACTIVE BRAND'}</span>
                        </button>

                        <div className="brand-value">
                            <strong>{String(brand.productCount).padStart(2, '0')}</strong>
                            <span>ITEMS</span>
                        </div>

                        <div className={`brand-value ${brand.saleProductCount > 0 ? 'sale' : ''}`}>
                            <strong>{brand.saleProductCount > 0 ? String(brand.saleProductCount).padStart(2, '0') : '—'}</strong>
                            <span>SALE</span>
                        </div>

                        <div className="brand-status">
                            <i className={brand.statusNo === 1 ? 'active' : 'inactive'}></i>
                            <span>{brand.statusNo === 1 ? 'ACTIVE' : 'INACTIVE'}</span>
                        </div>

                        <div className="brand-actions">
                            <button type="button" onClick={() => navigate(`/admin/brands/${brand.no}`)}>PRODUCTS →</button>
                            <button type="button" onClick={() => navigate(`/admin/brands/${brand.no}/edit`)}>EDIT</button>
                        </div>
                    </div>
                ))}

                {!loading && !error && filteredBrands.length === 0 && <div className="brand-empty">검색 결과가 없습니다.</div>}
            </div>
        </section>
    );
}

export default AdminBrandListPage;