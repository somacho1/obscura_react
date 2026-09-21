import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminBrandListPage.css';

interface BrandItem {
    no: number;
    name: string;
    country: string;
    productCount: number;
    saleProductCount: number;
    status: 'ACTIVE' | 'INACTIVE';
}

const sampleBrands: BrandItem[] = [
    { no: 1, name: '032c', country: 'GERMANY', productCount: 12, saleProductCount: 5, status: 'ACTIVE' },
    { no: 2, name: 'OPEN YY', country: 'KOREA', productCount: 8, saleProductCount: 3, status: 'ACTIVE' },
    { no: 3, name: 'YOUTH', country: 'KOREA', productCount: 15, saleProductCount: 0, status: 'ACTIVE' },
    { no: 4, name: 'MONTBELL', country: 'JAPAN', productCount: 6, saleProductCount: 2, status: 'ACTIVE' },
];

function AdminBrandListPage() {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('ALL');

    const filteredBrands = useMemo(() => {
        return sampleBrands.filter((brand) => {
            const keywordMatched = brand.name.toLowerCase().includes(keyword.toLowerCase());
            const statusMatched = status === 'ALL' || brand.status === status;
            return keywordMatched && statusMatched;
        });
    }, [keyword, status]);

    const totalProducts = sampleBrands.reduce((sum, brand) => sum + brand.productCount, 0);
    const totalSaleProducts = sampleBrands.reduce((sum, brand) => sum + brand.saleProductCount, 0);

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
                    <strong>{String(sampleBrands.length).padStart(2, '0')}</strong>
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

                {filteredBrands.map((brand) => (
                    <div className="brand-row" key={brand.no}>
                        <button type="button" className="brand-name" onClick={() => navigate(`/admin/brands/${brand.no}`)}>
                            <strong>{brand.name}</strong>
                            <span>{brand.country}</span>
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
                            <i className={brand.status === 'ACTIVE' ? 'active' : 'inactive'}></i>
                            <span>{brand.status}</span>
                        </div>

                        <div className="brand-actions">
                            <button type="button" onClick={() => navigate(`/admin/brands/${brand.no}`)}>PRODUCTS →</button>
                            <button type="button" onClick={() => navigate(`/admin/brands/${brand.no}/edit`)}>EDIT</button>
                        </div>
                    </div>
                ))}

                {filteredBrands.length === 0 && <div className="brand-empty">검색 결과가 없습니다.</div>}
            </div>
        </section>
    );
}

export default AdminBrandListPage;