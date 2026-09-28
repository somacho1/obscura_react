import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBrand } from '../../../api/brandApi';
import { getProductsByBrand, updateBulkDiscount } from '../../../api/productApi';
import type { BrandResponse } from '../../../ts/brand';
import type { ProductResponse } from '../../../ts/product';
import { getImageUrl } from '../../../ts/imageUrl';
import './AdminBrandDetailPage.css';

function AdminBrandDetailPage() {
    const navigate = useNavigate();
    const { no } = useParams();

    // 브랜드 정보
    const [brand, setBrand] = useState<BrandResponse | null>(null);

    // 해당 브랜드 상품 목록
    const [products, setProducts] = useState<ProductResponse[]>([]);

    // 관리자가 체크한 상품번호
    const [selectedNos, setSelectedNos] = useState<number[]>([]);

    // 선택 상품에 일괄 적용할 할인율
    const [discountRate, setDiscountRate] = useState('');

    // 브랜드/상품 조회 로딩
    const [loading, setLoading] = useState(true);

    // 일괄 할인 적용 로딩
    const [discountLoading, setDiscountLoading] = useState(false);

    // 브랜드 정보 + 해당 브랜드 상품 조회
    const loadData = async () => {
        if (!no) return;

        const brandNo = Number(no);

        if (Number.isNaN(brandNo)) {
            alert('잘못된 브랜드 번호입니다.');
            navigate('/admin/brands');
            return;
        }

        try {
            setLoading(true);

            const brandData = await getBrand(brandNo);
            setBrand(brandData);

            const productData = await getProductsByBrand(brandNo);
            setProducts(productData);
        } catch (error) {
            console.error('브랜드 상세 조회 실패:', error);
            alert('브랜드 정보를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [no]);

    // 상품 하나 선택 / 선택 해제
    const handleSelectProduct = (productNo: number) => {
        setSelectedNos((prev) => prev.includes(productNo) ? prev.filter((no) => no !== productNo) : [...prev, productNo]);
    };

    // 전체 상품 선택 / 전체 선택 해제
    const handleSelectAll = () => {
        if (products.length === 0) return;

        if (selectedNos.length === products.length) {
            setSelectedNos([]);
        } else {
            setSelectedNos(products.map((product) => product.no));
        }
    };

    // 선택 상품 할인율 일괄 적용
    const handleApplyDiscount = async () => {
        if (selectedNos.length === 0) {
            alert('할인 적용할 상품을 선택해주세요.');
            return;
        }

        const rate = Number(discountRate);

        if (discountRate.trim() === '' || Number.isNaN(rate) || rate < 0 || rate > 100) {
            alert('할인율은 0~100 사이로 입력해주세요.');
            return;
        }

        try {
            setDiscountLoading(true);

            await updateBulkDiscount({
                productNos: selectedNos,
                discountRate: rate,
            });

            alert(`${selectedNos.length}개 상품에 ${rate}% 할인을 적용했습니다.`);

            // 선택 상품과 할인율 입력값 초기화
            setSelectedNos([]);
            setDiscountRate('');

            // 변경된 할인율과 판매가 다시 조회
            await loadData();
        } catch (error) {
            console.error('일괄 할인 적용 실패:', error);
            alert(error instanceof Error ? error.message : '할인율 적용에 실패했습니다.');
        } finally {
            setDiscountLoading(false);
        }
    };

    // 가격 표시
    const formatPrice = (price: number) => {
        return `${price.toLocaleString('ko-KR')}원`;
    };

    // 데이터 조회 중
    if (loading) {
        return (
            <section className="brand-detail-admin">
                <div className="brand-detail-message">브랜드 정보를 불러오는 중입니다.</div>
            </section>
        );
    }

    // 브랜드 정보 없음
    if (!brand) {
        return (
            <section className="brand-detail-admin">
                <div className="brand-detail-message">브랜드 정보를 찾을 수 없습니다.</div>
            </section>
        );
    }

    // 할인 상품 개수
    const saleProductCount = products.filter((product) => product.discountRate > 0).length;

    // 전체 선택 여부
    const allSelected = products.length > 0 && selectedNos.length === products.length;

    return (
        <section className="brand-detail-admin">

            {/* 브랜드 상단 정보 */}
            <div className="brand-detail-heading">
                <div>
                    <button type="button" className="brand-detail-back" onClick={() => navigate('/admin/brands')}>
                        ← BRANDS
                    </button>

                    <span>ADMIN / BRANDS</span>

                    <h1>{brand.name}</h1>

                    <p>{brand.detail || '등록된 브랜드 설명이 없습니다.'}</p>
                </div>

                <div className="brand-detail-heading-actions">
                    <button type="button" onClick={() => navigate(`/admin/brands/${brand.no}/edit`)}>
                        EDIT BRAND
                    </button>

                    <button type="button" className="brand-detail-add" onClick={() => navigate(`/admin/products/create?brand=${brand.no}`)}>
                        + ADD PRODUCT
                    </button>
                </div>
            </div>

            {/* 브랜드 상품 현황 */}
            <div className="brand-detail-overview">
                <div>
                    <span>PRODUCTS</span>
                    <strong>{products.length}</strong>
                    <p>등록 상품</p>
                </div>

                <div>
                    <span>SALE PRODUCTS</span>
                    <strong>{saleProductCount}</strong>
                    <p>할인 적용 상품</p>
                </div>

                <div>
                    <span>STATUS</span>
                    <strong>{brand.statusNo === 1 ? 'ACTIVE' : 'INACTIVE'}</strong>
                    <p>{brand.statusNo === 1 ? '사용 중인 브랜드' : '비활성 브랜드'}</p>
                </div>
            </div>

            {/* 상품 목록 상단 */}
            <div className="brand-product-heading">
                <div>
                    <h2>PRODUCTS</h2>
                    <span>{selectedNos.length} SELECTED</span>
                </div>

                {/* 선택 상품 일괄 할인 */}
                <div className="brand-discount-control">
                    <strong>선택 상품 할인</strong>

                    <div className="brand-discount-input">
                        <input type="number" min="0" max="100" value={discountRate} onChange={(e) => setDiscountRate(e.target.value)} placeholder="0" />
                        <span>%</span>
                    </div>

                    <button type="button" onClick={handleApplyDiscount} disabled={selectedNos.length === 0 || discountLoading}>
                        {discountLoading ? 'APPLYING...' : `APPLY DISCOUNT (${selectedNos.length})`}
                    </button>
                </div>
            </div>

            {/* 상품 목록 */}
            <div className="brand-product-table">

                {/* 테이블 헤더 */}
                <div className="brand-product-table-head">
                    <div>
                        <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />
                    </div>

                    <div>PRODUCT</div>
                    <div>PRICE</div>
                    <div>DISCOUNT</div>
                    <div>SALE PRICE</div>
                    <div>STATUS</div>
                    <div>MANAGE</div>
                </div>

                {/* 등록 상품 없음 */}
                {products.length === 0 ? (
                    <div className="brand-product-empty">
                        등록된 상품이 없습니다.
                    </div>
                ) : (
                    products.map((product) => (
                        <div className="brand-product-row" key={product.no}>

                            {/* 상품 선택 */}
                            <div>
                                <input type="checkbox" checked={selectedNos.includes(product.no)} onChange={() => handleSelectProduct(product.no)} />
                            </div>

                            {/* 상품 정보 */}
                            <div className="brand-product-info">
                                <div className="brand-product-image">
                                    {product.mainImageUrl ? <img src={getImageUrl(product.mainImageUrl)} alt={product.name} /> : <span>NO IMAGE</span>}
                                </div>

                                <div>
                                    <strong>{product.name}</strong>
                                    <span>{product.categoryName}</span>
                                </div>
                            </div>

                            {/* 정가 */}
                            <div className="brand-product-price">
                                {formatPrice(product.price)}
                            </div>

                            {/* 할인율 */}
                            <div className={`brand-product-discount ${product.discountRate > 0 ? 'active' : ''}`}>
                                {product.discountRate > 0 ? `${product.discountRate}%` : '-'}
                            </div>

                            {/* 판매가 */}
                            <div className="brand-product-sale-price">
                                {formatPrice(product.salePrice)}
                            </div>

                            {/* 상품 상태 */}
                            <div className="brand-product-status">
                                <i className={product.statusNo === 1 ? 'active' : ''}></i>
                                {product.statusNo === 1 ? 'ACTIVE' : 'INACTIVE'}
                            </div>

                            {/* 상품 수정 */}
                            <div>
                                <button type="button" className="brand-product-edit" onClick={() => navigate(`/admin/products/${product.no}/edit`)}>
                                    EDIT →
                                </button>
                            </div>

                        </div>
                    ))
                )}
            </div>
        </section>
    );
}

export default AdminBrandDetailPage;