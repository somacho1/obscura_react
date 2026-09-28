import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBrands } from '../../../api/brandApi';
import { getCategories } from '../../../api/categoryApi';
import { getProductDetail } from '../../../api/productApi';
import { uploadDetailImages, uploadMainImage } from '../../../api/productImageApi';
import { getImageUrl } from '../../../ts/imageUrl';
import type { BrandResponse } from '../../../ts/brand';
import type { CategoryResponse } from '../../../ts/category';
import './AdminProductCreatePage.css';
import './AdminProductEditPage.css';

interface ProductImage { no?: number; url: string; file?: File; }
interface ProductImageDTO { no: number; imageUrl: string; imageType: string; displayYn: string; seqNo: number; }
interface ProductOptionDTO { no: number; color: string | null; sizeValue: string | null; useYn: string; }
interface StockDTO { no: number; qty: number; }
interface ProductOptionForm { no?: number; stockNo?: number; color: string; sizeValue: string; qty: number; }

const API_ROOT = 'http://localhost:9101/api';
const MAX_DETAIL_IMAGES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 이미지·옵션·재고 API 호출 시 백엔드 오류 메시지를 화면에 전달합니다.
async function apiRequest<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_ROOT}${path}`, init?.body ? { ...init, headers: { 'Content-Type': 'application/json' } } : init);
    if (!response.ok) throw new Error((await response.text()) || `요청 실패: ${response.status}`);
    return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

function AdminProductEditPage() {
    const { productNo } = useParams<{ productNo: string }>();
    const navigate = useNavigate();
    const no = Number(productNo);

    // 상품 기본정보
    const [brands, setBrands] = useState<BrandResponse[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [brandNo, setBrandNo] = useState(0);
    const [categoryNo, setCategoryNo] = useState(0);
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [detail, setDetail] = useState('');
    const [sizeDetail, setSizeDetail] = useState('');
    const [price, setPrice] = useState(0);
    const [discountRate, setDiscountRate] = useState(0);
    const [statusNo, setStatusNo] = useState(1);
    const [originalStatusNo, setOriginalStatusNo] = useState(1);

    // 이미지: 기존 데이터는 no를, 새 파일은 File과 미리보기 URL을 보관합니다.
    const [mainImage, setMainImage] = useState<ProductImage | null>(null);
    const [originalMainNo, setOriginalMainNo] = useState<number | null>(null);
    const [detailImages, setDetailImages] = useState<ProductImage[]>([]);
    const [removedImageNos, setRemovedImageNos] = useState<number[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const detailPreviewUrls = useRef<string[]>([]);

    // 기존 옵션 번호와 재고 번호를 함께 보관해야 정확한 재고 행을 수정할 수 있습니다.
    const [options, setOptions] = useState<ProductOptionForm[]>([]);
    const [removedOptionNos, setRemovedOptionNos] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const salePrice = useMemo(() => Math.floor(price * (100 - discountRate) / 100), [price, discountRate]);

    // 상품 상세 API에는 이미지 번호와 정확한 재고수량이 없어 각각 별도로 조회합니다.
    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!Number.isSafeInteger(no) || no <= 0) {
                setError('잘못된 상품번호입니다.');
                setLoading(false);
                return;
            }

            try {
                const [brandData, categoryData, product, imageData, optionData] = await Promise.all([
                    getBrands(),
                    getCategories(),
                    getProductDetail(no),
                    apiRequest<ProductImageDTO[]>(`/product-images/product/${no}`),
                    apiRequest<ProductOptionDTO[]>(`/product-options/product/${no}`),
                ]);

                // soldOut은 수량이 아니므로 사용 중인 옵션의 STOCK 행을 조회합니다.
                const optionForms = await Promise.all(
                    optionData.filter((option) => option.useYn === 'Y').map(async (option): Promise<ProductOptionForm> => {
                        const stock = await apiRequest<StockDTO>(`/stocks/option/${option.no}`);
                        return {
                            no: option.no, stockNo: stock.no,
                            color: option.color ?? '', sizeValue: option.sizeValue ?? '', qty: stock.qty,
                        };
                    }),
                );
                if (!active) return;

                const visible = imageData.filter((image) => image.displayYn === 'Y');
                const main = visible.find((image) => image.imageType === 'MAIN');

                setBrands(brandData);
                setCategories(categoryData);
                setBrandNo(product.bno);
                setCategoryNo(product.cno);
                setCode(product.code ?? '');
                setName(product.name);
                setDetail(product.detail ?? '');
                setSizeDetail(product.sizeDetail ?? '');
                setPrice(product.price);
                setDiscountRate(product.discountRate ?? 0);
                setStatusNo(product.statusNo);
                setOriginalStatusNo(product.statusNo);
                setMainImage(main ? { no: main.no, url: main.imageUrl } : null);
                setOriginalMainNo(main?.no ?? null);
                setDetailImages(
                    visible.filter((image) => image.imageType === 'DETAIL')
                        .sort((a, b) => a.seqNo - b.seqNo)
                        .map((image) => ({ no: image.no, url: image.imageUrl })),
                );
                setOptions(optionForms.length ? optionForms : [{ color: '', sizeValue: '', qty: 0 }]);
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : '상품 정보를 불러오지 못했습니다.');
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => { active = false; };
    }, [no]);

    // 서버 이미지 URL은 유지하고, 브라우저에서 만든 새 파일 미리보기 URL만 해제합니다.
    useEffect(() => () => {
        if (mainImage?.file) URL.revokeObjectURL(mainImage.url);
    }, [mainImage]);
    useEffect(() => () => {
        detailPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    }, []);

    const validateFile = (file: File) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            alert('JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.');
            return false;
        }
        if (file.size > MAX_FILE_SIZE) {
            alert('이미지는 한 장당 최대 10MB입니다.');
            return false;
        }
        return true;
    };

    // 대표 이미지 번호를 유지해 새 이미지 업로드 후 기존 이미지를 삭제합니다.
    const changeMainImage = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file && validateFile(file)) {
            setMainImage({ no: mainImage?.no, url: URL.createObjectURL(file), file });
        }
    };
    const removeMainImage = () => {
        if (mainImage?.no) setRemovedImageNos((prev) => [...prev, mainImage.no!]);
        setMainImage(null);
    };
    const addDetailImages = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (files.some((file) => !validateFile(file))) return;
        if (detailImages.length + files.length > MAX_DETAIL_IMAGES) {
            alert('상세 이미지는 최대 10장입니다.');
            return;
        }
        const next = files.map((file) => ({ url: URL.createObjectURL(file), file }));
        detailPreviewUrls.current.push(...next.map((image) => image.url));
        setDetailImages((prev) => [...prev, ...next]);
    };
    const removeDetailImage = (index: number) => {
        const image = detailImages[index];
        if (image.no) setRemovedImageNos((prev) => [...prev, image.no!]);
        setDetailImages((prev) => prev.filter((_, i) => i !== index));
        setDraggedIndex(null);
    };
    const dropDetailImage = (index: number) => {
        if (draggedIndex === null || draggedIndex === index) return;
        setDetailImages((prev) => {
            const next = [...prev];
            const [moved] = next.splice(draggedIndex, 1);
            next.splice(index, 0, moved);
            return next;
        });
        setDraggedIndex(null);
    };

    // 옵션 추가·수정·제거는 먼저 화면에 반영하고 저장 시 API를 호출합니다.
    const changeOption = (index: number, changes: Partial<ProductOptionForm>) => {
        setOptions((prev) => prev.map((option, i) => i === index ? { ...option, ...changes } : option));
    };
    const removeOption = (index: number) => {
        if (options.length === 1) {
            alert('옵션은 최소 한 개 이상 유지해주세요.');
            return;
        }
        const option = options[index];
        if (option.no) setRemovedOptionNos((prev) => [...prev, option.no!]);
        setOptions((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving || loading) return;

        // 기존 상품도 수정할 때 CODE를 채우도록 검사합니다.
        if (!code.trim()) {
            alert('상품 코드를 입력해주세요.');
            return;
        }

        if (!brandNo || !categoryNo || !name.trim() || !mainImage) {
            alert('브랜드, 카테고리, 상품명, 대표 이미지를 확인해주세요.');
            return;
        }
        if (!Number.isSafeInteger(price) || price < 0 || !Number.isInteger(discountRate) || discountRate < 0 || discountRate > 100) {
            alert('가격과 할인율을 확인해주세요.');
            return;
        }

        // 옵션별 필수값·재고수량·중복 조합을 저장 전에 확인합니다.
        for (const [index, option] of options.entries()) {
            if (!option.color.trim() || !option.sizeValue.trim() || !Number.isSafeInteger(option.qty) || option.qty < 0) {
                alert(`${index + 1}번째 옵션의 색상·사이즈·재고를 확인해주세요.`);
                return;
            }
            const duplicated = options.some((other, i) =>
                i !== index &&
                other.color.trim().toUpperCase() === option.color.trim().toUpperCase() &&
                other.sizeValue.trim().toUpperCase() === option.sizeValue.trim().toUpperCase(),
            );
            if (duplicated) {
                alert('색상과 사이즈 조합이 중복되었습니다.');
                return;
            }
        }

        // 기존 백엔드는 판매중지 상품에 새 이미지나 새 옵션을 등록하지 않습니다.
        if (originalStatusNo === 0 && (
            mainImage.file ||
            detailImages.some((image) => image.file) ||
            options.some((option) => !option.no)
        )) {
            alert('판매중지 상품은 먼저 판매중으로 변경해 저장한 뒤 이미지·옵션을 추가해주세요.');
            return;
        }

        try {
            setSaving(true);
            setError('');

            // 새 대표 이미지를 먼저 올린 다음 이전 대표 이미지 행을 삭제합니다.
            if (mainImage.file) await uploadMainImage(no, mainImage.file);
            const previousMainNo =
                originalMainNo && (mainImage.file || removedImageNos.includes(originalMainNo))
                    ? originalMainNo : null;
            if (previousMainNo) await apiRequest(`/product-images/${previousMainNo}`, { method: 'DELETE' });

            // 새 상세 이미지를 올리고 화면 순서를 SEQNO에 저장합니다.
            const files = detailImages.flatMap((image) => image.file ? [image.file] : []);
            const uploaded = files.length ? await uploadDetailImages(no, files) : [];
            let uploadIndex = 0;
            const imageNos = detailImages.map((image) => image.no ?? uploaded[uploadIndex++].no);
            for (const [index, imageNo] of imageNos.entries()) {
                await apiRequest(`/product-images/${imageNo}`, {
                    method: 'PUT',
                    body: JSON.stringify({ seqNo: index + 1 }),
                });
            }
            for (const imageNo of removedImageNos.filter((imageNo) => imageNo !== originalMainNo)) {
                await apiRequest(`/product-images/${imageNo}`, { method: 'DELETE' });
            }

            // 기존 옵션과 기존 STOCK 행은 번호를 유지한 채 수정합니다.
            for (const option of options.filter((item) => item.no)) {
                await apiRequest(`/product-options/${option.no}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        color: option.color.trim(),
                        sizeValue: option.sizeValue.trim(),
                        useYn: 'Y',
                    }),
                });
                await apiRequest(`/stocks/${option.stockNo}`, {
                    method: 'PUT',
                    body: JSON.stringify({ qty: option.qty }),
                });
            }

            // 새 옵션을 만들고, 반환된 옵션 번호로 최초 재고 행을 만듭니다.
            for (const option of options.filter((item) => !item.no)) {
                const created = await apiRequest<{ no: number }>('/product-options', {
                    method: 'POST',
                    body: JSON.stringify({
                        pno: no, color: option.color.trim(),
                        sizeValue: option.sizeValue.trim(), useYn: 'Y',
                    }),
                });
                await apiRequest('/stocks', {
                    method: 'POST',
                    body: JSON.stringify({ pono: created.no, qty: option.qty }),
                });
            }

            // 기존 옵션의 REMOVE는 주문 참조를 보호하기 위해 USEYN = N으로 처리됩니다.
            for (const optionNo of removedOptionNos) {
                await apiRequest(`/product-options/${optionNo}`, { method: 'DELETE' });
            }

            // 이미지·옵션 작업 뒤 기본정보와 판매상태를 저장합니다.
            const response = await fetch(`http://localhost:9101/api/products/${no}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bno: brandNo, cno: categoryNo, code: code.trim().toUpperCase(), name: name.trim(),
                    detail: detail.trim(), sizeDetail: sizeDetail.trim(),
                    price, discountRate, statusNo,
                }),
            });
            if (!response.ok) {
                throw new Error((await response.text()) || `상품 수정 실패: ${response.status}`);
            }

            alert('상품 정보, 이미지, 옵션 및 재고가 수정되었습니다.');
            navigate(`/admin/brands/${brandNo}`);
        } catch (err) {
            setError(`${err instanceof Error ? err.message : '수정 실패'} 일부 변경이 저장됐을 수 있으므로 새로고침 후 확인해주세요.`);
        } finally {
            setSaving(false);
        }
    };

    // 서버에서 주문 이력을 확인한 뒤, 삭제 가능한 상품만 영구 삭제합니다.
    const deletePermanently = async () => {
        if (saving || deleting || !window.confirm('이 상품을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
        try {
            setDeleting(true);
            setError('');
            const response = await fetch(`http://localhost:9101/api/products/${no}/permanent`, { method: 'DELETE' });
            if (!response.ok) throw new Error((await response.text()) || '영구 삭제 실패');
            alert('상품이 영구 삭제되었습니다.');
            navigate(`/admin/brands/${brandNo}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : '영구 삭제 실패');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="admin-product-create admin-product-edit">
            <div className="admin-product-create__heading">
                <div><span>PRODUCT</span><h1>상품 수정</h1><p>상품 정보, 이미지, 옵션과 재고를 수정합니다.</p></div>
                <button type="button" className="admin-product-create__back" onClick={() => navigate(-1)}>← BACK</button>
            </div>

            {loading ? <div className="admin-product-create__message">상품 정보를 불러오는 중입니다.</div> : (
                <>
                    {error && <div className="admin-product-create__error" role="alert">{error}</div>}
                    {brandNo > 0 && (
                        <form className="admin-product-create__form" onSubmit={handleSubmit}>
                            {/* 01. 상품 기본정보 */}
                            <section className="admin-product-create__section">
                                <div className="admin-product-create__section-title">
                                    <span>01</span><div><h2>PRODUCT INFORMATION</h2><p>상품 기본정보를 수정합니다.</p></div>
                                </div>
                                <div className="admin-product-create__grid">
                                    <label className="admin-product-create__field">
                                        <span>BRAND *</span>
                                        <select value={brandNo} onChange={(e) => setBrandNo(Number(e.target.value))}>
                                            {brands.filter((brand) => brand.statusNo === 1 || brand.no === brandNo).map((brand) => (
                                                <option key={brand.no} value={brand.no}>{brand.name}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="admin-product-create__field">
                                        <span>CATEGORY *</span>
                                        <select value={categoryNo} onChange={(e) => setCategoryNo(Number(e.target.value))}>
                                            {categories.filter((category) => category.statusNo === 1 || category.no === categoryNo).map((category) => (
                                                <option key={category.no} value={category.no}>{category.name}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="admin-product-create__field admin-product-create__field--full">
                                        <span>CODE *</span>
                                        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} maxLength={50} placeholder="예: OCBDFWMWJK003OL" required />
                                    </label>
                                    <label className="admin-product-create__field admin-product-create__field--full">
                                        <span>PRODUCT NAME *</span>
                                        <input value={name} onChange={(e) => setName(e.target.value)} required />
                                    </label>
                                    <label className="admin-product-create__field admin-product-create__field--full">
                                        <span>DESCRIPTION</span>
                                        <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={6} />
                                    </label>
                                    <label className="admin-product-create__field admin-product-create__field--full">
                                        <span>SIZE DETAIL</span>
                                        <textarea value={sizeDetail} onChange={(e) => setSizeDetail(e.target.value)} rows={5} />
                                    </label>
                                </div>
                            </section>

                            {/* 02. 가격과 판매상태 */}
                            <section className="admin-product-create__section">
                                <div className="admin-product-create__section-title">
                                    <span>02</span><div><h2>PRICE & STATUS</h2><p>가격과 판매 상태를 수정합니다.</p></div>
                                </div>
                                <div className="admin-product-create__grid">
                                    <label className="admin-product-create__field">
                                        <span>PRICE *</span>
                                        <div className="admin-product-create__price-input">
                                            <input type="number" min="0" step="1" value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
                                            <em>KRW</em>
                                        </div>
                                    </label>
                                    <label className="admin-product-create__field">
                                        <span>DISCOUNT RATE</span>
                                        <div className="admin-product-create__price-input">
                                            <input type="number" min="0" max="100" step="1" value={discountRate} onChange={(e) => setDiscountRate(Number(e.target.value))} />
                                            <em>%</em>
                                        </div>
                                    </label>
                                    <div className="admin-product-create__field">
                                        <span>SALE PRICE</span>
                                        <div className="admin-product-create__sale-price">{salePrice.toLocaleString()} KRW</div>
                                    </div>
                                    <label className="admin-product-create__field">
                                        <span>STATUS</span>
                                        <select value={statusNo} onChange={(e) => setStatusNo(Number(e.target.value))}>
                                            <option value={1}>판매중</option><option value={0}>판매중지</option>
                                        </select>
                                    </label>
                                </div>
                            </section>

                            {/* 03. 이미지 교체·추가·삭제·순서 변경 */}
                            <section className="admin-product-create__section">
                                <div className="admin-product-create__section-title">
                                    <span>03</span><div><h2>PRODUCT IMAGES</h2><p>이미지를 추가·교체·삭제합니다.</p></div>
                                </div>
                                <div className="admin-product-create__image-group">
                                    <div className="admin-product-create__image-header">
                                        <div><h3>MAIN IMAGE *</h3><p>대표 이미지는 4:5 비율로 자동 처리됩니다.</p><p>JPG, PNG, WEBP / 장당 최대 10MB</p></div>
                                    </div>
                                    <div className="admin-product-create__main-image">
                                        {mainImage ? (
                                            <div className="admin-product-create__main-preview">
                                                <img src={getImageUrl(mainImage.url)} alt="대표 이미지" />
                                                <label className="admin-product-edit__replace">
                                                    REPLACE
                                                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={changeMainImage} />
                                                </label>
                                                <button type="button" onClick={removeMainImage}>REMOVE</button>
                                            </div>
                                        ) : (
                                            <label className="admin-product-create__image-upload">
                                                <span>+ SELECT IMAGE</span>
                                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={changeMainImage} />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className="admin-product-create__image-group">
                                    <div className="admin-product-create__image-header">
                                        <div><h3>DETAIL IMAGES</h3><p>이미지를 드래그하여 순서를 변경할 수 있습니다.</p><p>최대 10장 / 장당 최대 10MB</p></div>
                                        <strong>{detailImages.length} / {MAX_DETAIL_IMAGES}</strong>
                                    </div>
                                    <div className="admin-product-create__detail-images">
                                        {detailImages.map((image, index) => (
                                            <div
                                                key={image.no ?? image.url}
                                                className="admin-product-create__detail-preview"
                                                draggable
                                                onDragStart={() => setDraggedIndex(index)}
                                                onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
                                                onDrop={() => dropDetailImage(index)}
                                                onDragEnd={() => setDraggedIndex(null)}
                                            >
                                                <div className="admin-product-create__detail-image-box">
                                                    <img src={getImageUrl(image.url)} alt={`상세 이미지 ${index + 1}`} draggable={false} />
                                                    <span>{String(index + 1).padStart(2, '0')}</span>
                                                    <div className="admin-product-create__drag-handle">DRAG</div>
                                                </div>
                                                <button type="button" onClick={() => removeDetailImage(index)}>REMOVE</button>
                                            </div>
                                        ))}
                                        {detailImages.length < MAX_DETAIL_IMAGES && (
                                            <label className="admin-product-create__image-upload admin-product-create__image-upload--detail">
                                                <span>+ ADD IMAGES</span>
                                                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addDetailImages} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* 04. 옵션별 현재 재고를 수정합니다. */}
                            <section className="admin-product-create__section">
                                <div className="admin-product-create__section-title">
                                    <span>04</span><div><h2>PRODUCT OPTIONS</h2><p>색상, 사이즈와 옵션별 현재 재고를 수정합니다.</p></div>
                                </div>
                                <div className="admin-product-create__options">
                                    <div className="admin-product-create__option-head">
                                        <span>COLOR</span><span>SIZE</span><span>STOCK</span><span></span>
                                    </div>
                                    {options.map((option, index) => (
                                        <div className="admin-product-create__option-row" key={option.no ?? `new-${index}`}>
                                            <input value={option.color} onChange={(e) => changeOption(index, { color: e.target.value })} placeholder="BLACK" />
                                            <input value={option.sizeValue} onChange={(e) => changeOption(index, { sizeValue: e.target.value })} placeholder="S / M / L" />
                                            <input type="number" min="0" step="1" value={option.qty} onChange={(e) => changeOption(index, { qty: Number(e.target.value) })} />
                                            <button type="button" onClick={() => removeOption(index)}>REMOVE</button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="admin-product-create__add-option"
                                        onClick={() => setOptions((prev) => [...prev, { color: '', sizeValue: '', qty: 0 }])}
                                    >
                                        + ADD OPTION
                                    </button>
                                </div>
                            </section>

                            <div className="admin-product-create__actions">
                                <button type="button" className="admin-product-edit__permanent" disabled={saving || deleting} onClick={() => void deletePermanently()}>영구 삭제</button>
                                <button type="button" className="admin-product-create__cancel" disabled={saving} onClick={() => navigate(-1)}>취소</button>
                                <button type="submit" className="admin-product-create__submit" disabled={saving}>
                                    {saving ? '저장 중...' : '상품 정보 저장'}
                                </button>
                            </div>
                        </form>
                    )}
                </>
            )}
        </div>
    );
}

export default AdminProductEditPage;