import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getBrands } from '../../../api/brandApi';
import { getCategories } from '../../../api/categoryApi';
import { createProduct } from '../../../api/productApi';
import { uploadDetailImages, uploadMainImage } from '../../../api/productImageApi';
import { createProductOption } from '../../../api/productOptionApi';
import { createStock } from '../../../api/stockApi';
import type { BrandResponse } from '../../../ts/brand';
import type { CategoryResponse } from '../../../ts/category';
import type { SizeGuide, SizeGuideType } from '../../../ts/sizeGuide';
import { SIZE_GUIDE_TYPE_OPTIONS, createEmptySizeGuide, getMeasurementOptions } from '../../../ts/sizeGuide';
import { DELIVERY_POLICY } from '../../../data/deliveryPolicy';

import './AdminProductCreatePage.css';

interface ProductOptionForm {
    color: string;
    sizeValue: string;
    qty: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DETAIL_IMAGES = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function AdminProductCreatePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const brandParam = searchParams.get('brand');

    const [brands, setBrands] = useState<BrandResponse[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);

    const [brandNo, setBrandNo] = useState(brandParam ? Number(brandParam) : 0);
    const [categoryNo, setCategoryNo] = useState(0);
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [detail, setDetail] = useState('');

    // PRODUCT DETAIL
    const [detailTab, setDetailTab] = useState<'INFO' | 'SIZE' | 'DELIVERY'>('INFO');
    const [sizeGuide, setSizeGuide] = useState<SizeGuide>(createEmptySizeGuide('NONE'));

    const [price, setPrice] = useState(0);
    const [discountRate, setDiscountRate] = useState(0);
    const [statusNo, setStatusNo] = useState(1);

    const [mainImage, setMainImage] = useState<File | null>(null);
    const [mainPreview, setMainPreview] = useState('');

    const [detailImages, setDetailImages] = useState<File[]>([]);
    const [detailPreviews, setDetailPreviews] = useState<string[]>([]);
    const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);

    const [options, setOptions] = useState<ProductOptionForm[]>([
        { color: '', sizeValue: '', qty: 0 },
    ]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const salePrice = useMemo(() => {
        if (!price) return 0;
        return Math.round(price * (1 - discountRate / 100));
    }, [price, discountRate]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError('');

                const [brandData, categoryData] = await Promise.all([getBrands(), getCategories()]);
                setBrands(brandData);
                setCategories(categoryData);

                if (!brandNo && brandData.length > 0) setBrandNo(brandData[0].no);

                const activeCategories = categoryData.filter((category) => category.statusNo === 1);
                if (activeCategories.length > 0) setCategoryNo(activeCategories[0].no);
            } catch (err) {
                setError(err instanceof Error ? err.message : '상품 등록 정보를 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        return () => {
            if (mainPreview) URL.revokeObjectURL(mainPreview);
            detailPreviews.forEach((preview) => URL.revokeObjectURL(preview));
        };
    }, [mainPreview, detailPreviews]);

    const validateImage = (file: File) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            alert('JPG, JPEG, PNG, WEBP 이미지만 업로드할 수 있습니다.');
            return false;
        }

        if (file.size > MAX_FILE_SIZE) {
            alert('이미지는 한 장당 최대 10MB까지 업로드할 수 있습니다.');
            return false;
        }

        return true;
    };

    const handleMainImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!validateImage(file)) {
            event.target.value = '';
            return;
        }

        if (mainPreview) URL.revokeObjectURL(mainPreview);

        setMainImage(file);
        setMainPreview(URL.createObjectURL(file));
        event.target.value = '';
    };

    const handleRemoveMainImage = () => {
        if (mainPreview) URL.revokeObjectURL(mainPreview);
        setMainImage(null);
        setMainPreview('');
    };

    const handleDetailImagesChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files ?? []);
        if (selectedFiles.length === 0) return;

        const validFiles = selectedFiles.filter(validateImage);

        if (detailImages.length + validFiles.length > MAX_DETAIL_IMAGES) {
            alert(`상세 이미지는 최대 ${MAX_DETAIL_IMAGES}장까지 등록할 수 있습니다.`);
            event.target.value = '';
            return;
        }

        const newPreviews = validFiles.map((file) => URL.createObjectURL(file));

        setDetailImages((prev) => [...prev, ...validFiles]);
        setDetailPreviews((prev) => [...prev, ...newPreviews]);
        event.target.value = '';
    };

    const handleRemoveDetailImage = (index: number) => {
        URL.revokeObjectURL(detailPreviews[index]);

        setDetailImages((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
        setDetailPreviews((prev) => prev.filter((_, previewIndex) => previewIndex !== index));

        if (draggedImageIndex === index) setDraggedImageIndex(null);
    };

    const handleDetailDragStart = (index: number) => {
        setDraggedImageIndex(index);
    };

    const handleDetailDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    const handleDetailDrop = (targetIndex: number) => {
        if (draggedImageIndex === null || draggedImageIndex === targetIndex) {
            setDraggedImageIndex(null);
            return;
        }

        setDetailImages((prev) => {
            const next = [...prev];
            const [moved] = next.splice(draggedImageIndex, 1);
            next.splice(targetIndex, 0, moved);
            return next;
        });

        setDetailPreviews((prev) => {
            const next = [...prev];
            const [moved] = next.splice(draggedImageIndex, 1);
            next.splice(targetIndex, 0, moved);
            return next;
        });

        setDraggedImageIndex(null);
    };

    const handleDetailDragEnd = () => {
        setDraggedImageIndex(null);
    };

    const handleAddOption = () => {
        setOptions((prev) => [...prev, { color: '', sizeValue: '', qty: 0 }]);
    };

    const handleOptionChange = (index: number, field: keyof ProductOptionForm, value: string | number) => {
        setOptions((prev) => prev.map((option, optionIndex) => {
            if (optionIndex !== index) return option;
            return { ...option, [field]: value };
        }));
    };

    const handleSizeGuideTypeChange = (type: SizeGuideType) => {
        setSizeGuide(createEmptySizeGuide(type));
    };

    const handleAddSizeColumn = () => {
        setSizeGuide((prev) => ({
            ...prev,
            columns: [...prev.columns, ''],
            rows: prev.rows.map((row) => ({ ...row, values: [...row.values, ''] })),
        }));
    };

    const handleSizeColumnChange = (index: number, value: string) => {
        setSizeGuide((prev) => ({
            ...prev,
            columns: prev.columns.map((column, columnIndex) => columnIndex === index ? value : column),
        }));
    };

    const handleRemoveSizeColumn = (index: number) => {
        setSizeGuide((prev) => ({
            ...prev,
            columns: prev.columns.filter((_, columnIndex) => columnIndex !== index),
            rows: prev.rows.map((row) => ({ ...row, values: row.values.filter((_, valueIndex) => valueIndex !== index) })),
        }));
    };

    const handleAddSizeRow = () => {
        setSizeGuide((prev) => ({
            ...prev,
            rows: [...prev.rows, { label: '', values: Array(prev.columns.length).fill('') }],
        }));
    };

    const handleSizeRowLabelChange = (index: number, value: string) => {
        setSizeGuide((prev) => ({
            ...prev,
            rows: prev.rows.map((row, rowIndex) => rowIndex === index ? { ...row, label: value } : row),
        }));
    };

    const handleSizeValueChange = (rowIndex: number, valueIndex: number, value: string) => {
        setSizeGuide((prev) => ({
            ...prev,
            rows: prev.rows.map((row, currentRowIndex) => {
                if (currentRowIndex !== rowIndex) return row;
                return { ...row, values: row.values.map((item, currentValueIndex) => currentValueIndex === valueIndex ? value : item) };
            }),
        }));
    };

    const handleRemoveSizeRow = (index: number) => {
        setSizeGuide((prev) => ({
            ...prev,
            rows: prev.rows.filter((_, rowIndex) => rowIndex !== index),
        }));
    };

    const handleAddRecommendedRow = (label: string) => {
        if (!label) return;

        setSizeGuide((prev) => {
            if (prev.rows.some((row) => row.label === label)) return prev;

            return {
                ...prev,
                rows: [...prev.rows, { label, values: Array(prev.columns.length).fill('') }],
            };
        });
    };

    const handleRemoveOption = (index: number) => {
        if (options.length === 1) {
            alert('상품 옵션은 최소 1개 이상 등록해주세요.');
            return;
        }

        setOptions((prev) => prev.filter((_, optionIndex) => optionIndex !== index));
    };

    const validateOptions = () => {
        for (let i = 0; i < options.length; i++) {
            const option = options[i];

            if (!option.color.trim()) {
                alert(`${i + 1}번째 옵션의 색상을 입력해주세요.`);
                return false;
            }

            if (!option.sizeValue.trim()) {
                alert(`${i + 1}번째 옵션의 사이즈를 입력해주세요.`);
                return false;
            }

            if (option.qty < 0) {
                alert(`${i + 1}번째 옵션의 재고는 0 이상이어야 합니다.`);
                return false;
            }

            const duplicate = options.some((target, targetIndex) => {
                if (targetIndex === i) return false;

                return target.color.trim().toUpperCase() === option.color.trim().toUpperCase()
                    && target.sizeValue.trim().toUpperCase() === option.sizeValue.trim().toUpperCase();
            });

            if (duplicate) {
                alert(`${option.color} / ${option.sizeValue} 옵션이 중복되었습니다.`);
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!brandNo) {
            alert('브랜드를 선택해주세요.');
            return;
        }

        if (!categoryNo) {
            alert('카테고리를 선택해주세요.');
            return;
        }

        if (!code.trim()) {
            alert('상품 코드를 입력해주세요.');
            return;
        }

        if (!name.trim()) {
            alert('상품명을 입력해주세요.');
            return;
        }

        if (price <= 0) {
            alert('상품 가격을 입력해주세요.');
            return;
        }

        if (discountRate < 0 || discountRate > 100) {
            alert('할인율은 0~100 사이로 입력해주세요.');
            return;
        }

        if (!mainImage) {
            alert('대표 이미지를 등록해주세요.');
            return;
        }

        if (!validateOptions()) return;

        try {
            setSaving(true);
            setError('');

            // 1. 상품 등록
            const createdProduct = await createProduct({
                bno: brandNo,
                cno: categoryNo,
                code: code.trim().toUpperCase(),
                name: name.trim(),
                detail: detail.trim(),
                sizeDetail: sizeGuide.type === 'NONE' ? null : JSON.stringify(sizeGuide),
                price,
                discountRate,
                statusNo,
            });

            // 2. 대표 이미지 등록
            await uploadMainImage(createdProduct.no, mainImage);

            // 3. 상세 이미지 등록
            // detailImages 배열의 현재 순서가 그대로 SEQNO 1, 2, 3... 으로 저장됨
            if (detailImages.length > 0) await uploadDetailImages(createdProduct.no, detailImages);

            // 4. 상품 옵션 등록 후 생성된 옵션 번호로 재고 등록
            for (const option of options) {
                const createdOption = await createProductOption({
                    pno: createdProduct.no,
                    color: option.color.trim(),
                    sizeValue: option.sizeValue.trim(),
                    useYn: 'Y',
                });

                await createStock({
                    pono: createdOption.no,
                    qty: option.qty,
                });
            }

            alert('상품이 등록되었습니다.');
            navigate(`/admin/brands/${brandNo}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : '상품 등록에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-product-create">
                <div className="admin-product-create__heading">
                    <div>
                        <span>PRODUCT</span>
                        <h1>상품 등록</h1>
                    </div>
                </div>

                <div className="admin-product-create__message">상품 등록 정보를 불러오는 중입니다.</div>
            </div>
        );
    }

    return (
        <div className="admin-product-create">
            <div className="admin-product-create__heading">
                <div>
                    <span>PRODUCT</span>
                    <h1>상품 등록</h1>
                    <p>상품 정보, 이미지, 옵션 및 재고를 등록합니다.</p>
                </div>

                <button type="button" className="admin-product-create__back" onClick={() => navigate(-1)}>← BACK</button>
            </div>

            {error && <div className="admin-product-create__error">{error}</div>}

            <form className="admin-product-create__form" onSubmit={handleSubmit}>
                {/* 01 PRODUCT INFORMATION */}
                <section className="admin-product-create__section">
                    <div className="admin-product-create__section-title">
                        <span>01</span>
                        <div>
                            <h2>PRODUCT INFORMATION</h2>
                            <p>상품의 기본 정보를 입력해주세요.</p>
                        </div>
                    </div>

                    <div className="admin-product-create__grid">
                        <label className="admin-product-create__field">
                            <span>BRAND *</span>
                            <select value={brandNo} onChange={(e) => setBrandNo(Number(e.target.value))}>
                                <option value={0}>브랜드 선택</option>
                                {brands.filter((brand) => brand.statusNo === 1).map((brand) => (
                                    <option key={brand.no} value={brand.no}>{brand.name}</option>
                                ))}
                            </select>
                        </label>

                        <label className="admin-product-create__field">
                            <span>CATEGORY *</span>
                            <select value={categoryNo} onChange={(e) => setCategoryNo(Number(e.target.value))}>
                                <option value={0}>카테고리 선택</option>
                                {categories.filter((category) => category.statusNo === 1).map((category) => (
                                    <option key={category.no} value={category.no}>{category.name}</option>
                                ))}
                            </select>
                        </label>

                        <label className="admin-product-create__field admin-product-create__field--full">
                            <span>CODE *</span>
                            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} maxLength={50} placeholder="예: OCBDFWMWJK003OL" autoComplete="off" />
                        </label>

                        <label className="admin-product-create__field admin-product-create__field--full">
                            <span>PRODUCT NAME *</span>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="상품명을 입력해주세요." />
                        </label>
                    </div>
                </section>

                {/* 02 PRICE & STATUS */}
                <section className="admin-product-create__section">
                    <div className="admin-product-create__section-title">
                        <span>02</span>
                        <div>
                            <h2>PRICE & STATUS</h2>
                            <p>상품 가격과 판매 상태를 설정해주세요.</p>
                        </div>
                    </div>

                    <div className="admin-product-create__grid">
                        <label className="admin-product-create__field">
                            <span>PRICE *</span>
                            <div className="admin-product-create__price-input">
                                <input type="number" min="0" value={price || ''} onChange={(e) => setPrice(Number(e.target.value))} placeholder="0" />
                                <em>KRW</em>
                            </div>
                        </label>

                        <label className="admin-product-create__field">
                            <span>DISCOUNT RATE</span>
                            <div className="admin-product-create__price-input">
                                <input type="number" min="0" max="100" value={discountRate || ''} onChange={(e) => setDiscountRate(e.target.value === '' ? 0 : Number(e.target.value))} placeholder="0" />
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
                                <option value={1}>판매중</option>
                                <option value={0}>판매중지</option>
                            </select>
                        </label>
                    </div>
                </section>

                {/* 03 PRODUCT IMAGES */}
                <section className="admin-product-create__section">
                    <div className="admin-product-create__section-title">
                        <span>03</span>
                        <div>
                            <h2>PRODUCT IMAGES</h2>
                            <p>대표 이미지와 상세 이미지를 등록해주세요.</p>
                        </div>
                    </div>

                    <div className="admin-product-create__image-group">
                        <div className="admin-product-create__image-header">
                            <div>
                                <h3>MAIN IMAGE *</h3>
                                <p>대표 이미지는 4:5 비율, 1200 × 1500px로 자동 처리됩니다.</p>
                                <p>JPG, JPEG, PNG, WEBP / 장당 최대 10MB</p>
                            </div>
                        </div>

                        <div className="admin-product-create__main-image">
                            {mainPreview ? (
                                <div className="admin-product-create__main-preview">
                                    <img src={mainPreview} alt="대표 이미지 미리보기" />
                                    <button type="button" onClick={handleRemoveMainImage}>REMOVE</button>
                                </div>
                            ) : (
                                <label className="admin-product-create__image-upload">
                                    <span>+ SELECT IMAGE</span>
                                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleMainImageChange} />
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="admin-product-create__image-group">
                        <div className="admin-product-create__image-header">
                            <div>
                                <h3>DETAIL IMAGES</h3>
                                <p>상세 이미지는 원본 비율로 저장됩니다.</p>
                                <p>이미지를 드래그하여 노출 순서를 변경할 수 있습니다.</p>
                                <p>JPG, JPEG, PNG, WEBP / 최대 10장 / 장당 최대 10MB</p>
                            </div>

                            <strong>{detailImages.length} / {MAX_DETAIL_IMAGES}</strong>
                        </div>

                        <div className="admin-product-create__detail-images">
                            {detailPreviews.map((preview, index) => (
                                <div
                                    className={`admin-product-create__detail-preview ${draggedImageIndex === index ? 'is-dragging' : ''}`}
                                    key={preview}
                                    draggable
                                    onDragStart={() => handleDetailDragStart(index)}
                                    onDragOver={handleDetailDragOver}
                                    onDrop={() => handleDetailDrop(index)}
                                    onDragEnd={handleDetailDragEnd}
                                >
                                    <div className="admin-product-create__detail-image-box">
                                        <img src={preview} alt={`상세 이미지 ${index + 1}`} draggable={false} />
                                        <span>{String(index + 1).padStart(2, '0')}</span>
                                        <div className="admin-product-create__drag-handle">DRAG</div>
                                    </div>

                                    <button type="button" onClick={() => handleRemoveDetailImage(index)}>REMOVE</button>
                                </div>
                            ))}

                            {detailImages.length < MAX_DETAIL_IMAGES && (
                                <label className="admin-product-create__image-upload admin-product-create__image-upload--detail">
                                    <span>+ ADD IMAGES</span>
                                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleDetailImagesChange} />
                                </label>
                            )}
                        </div>
                    </div>
                </section>

                {/* 04 PRODUCT OPTIONS */}
                <section className="admin-product-create__section">
                    <div className="admin-product-create__section-title">
                        <span>04</span>
                        <div>
                            <h2>PRODUCT OPTIONS</h2>
                            <p>색상, 사이즈와 옵션별 재고를 입력해주세요.</p>
                        </div>
                    </div>

                    <div className="admin-product-create__options">
                        <div className="admin-product-create__option-head">
                            <span>COLOR</span>
                            <span>SIZE</span>
                            <span>STOCK</span>
                            <span></span>
                        </div>

                        {options.map((option, index) => (
                            <div className="admin-product-create__option-row" key={index}>
                                <input type="text" value={option.color} onChange={(e) => handleOptionChange(index, 'color', e.target.value)} placeholder="BLACK" />
                                <input type="text" value={option.sizeValue} onChange={(e) => handleOptionChange(index, 'sizeValue', e.target.value)} placeholder="S / M / L / XL" />
                                <input type="number" min="0" value={option.qty} onChange={(e) => handleOptionChange(index, 'qty', Number(e.target.value))} />
                                <button type="button" onClick={() => handleRemoveOption(index)}>REMOVE</button>
                            </div>
                        ))}

                        <button type="button" className="admin-product-create__add-option" onClick={handleAddOption}>+ ADD OPTION</button>
                    </div>
                </section>

                {/* 05 PRODUCT DETAIL */}
                <section className="admin-product-create__section">
                    <div className="admin-product-create__section-title">
                        <span>05</span>
                        <div>
                            <h2>PRODUCT DETAIL</h2>
                            <p>상품 상세페이지에 표시할 INFO, SIZE 정보를 설정합니다.</p>
                        </div>
                    </div>

                    <div className="admin-product-create__detail-tabs">
                        <button type="button" className={detailTab === 'INFO' ? 'active' : ''} onClick={() => setDetailTab('INFO')}>INFO</button>
                        <button type="button" className={detailTab === 'SIZE' ? 'active' : ''} onClick={() => setDetailTab('SIZE')}>SIZE</button>
                        <button type="button" className={detailTab === 'DELIVERY' ? 'active' : ''} onClick={() => setDetailTab('DELIVERY')}>DELIVERY</button>
                    </div>

                    <div className="admin-product-create__detail-content">
                        {detailTab === 'INFO' && (
                            <div className="admin-product-create__detail-info">
                                <label className="admin-product-create__field">
                                    <span>PRODUCT INFO</span>
                                    <textarea
                                        value={detail}
                                        onChange={(e) => setDetail(e.target.value)}
                                        placeholder={`상품 설명, 소재, 제품 특징 등을 입력해주세요.\n\n예)\nShell Nylon 100%\nPocketing Cotton 100%\n\n[SIZE]\n36 : 210-215mm\n37 : 220-225mm`}
                                        rows={14}
                                    />
                                </label>

                                <p className="admin-product-create__detail-help">
                                    상품별 설명, 소재, 세탁방법 등 자유로운 정보를 입력합니다.
                                </p>
                            </div>
                        )}

                        {detailTab === 'SIZE' && (
                            <div className="admin-product-create__size-guide">
                                <label className="admin-product-create__field">
                                    <span>SIZE GUIDE TYPE</span>
                                    <select value={sizeGuide.type} onChange={(e) => handleSizeGuideTypeChange(e.target.value as SizeGuideType)}>
                                        {SIZE_GUIDE_TYPE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </label>

                                {sizeGuide.type === 'NONE' ? (
                                    <div className="admin-product-create__size-empty">
                                        <strong>SIZE GUIDE를 사용하지 않습니다.</strong>
                                        <p>사이즈 정보가 필요한 경우 INFO 영역에 직접 작성할 수 있습니다.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="admin-product-create__size-setting">
                                            <label className="admin-product-create__field">
                                                <span>UNIT</span>
                                                <input
                                                    type="text"
                                                    value={sizeGuide.unit}
                                                    onChange={(e) => setSizeGuide((prev) => ({ ...prev, unit: e.target.value }))}
                                                    placeholder="cm"
                                                />
                                            </label>
                                        </div>

                                        {sizeGuide.type !== 'SHOES' && (
                                            <div className="admin-product-create__size-recommend">
                                                <span>MEASUREMENT</span>

                                                <div>
                                                    {getMeasurementOptions(sizeGuide.type).map((measurement) => (
                                                        <button key={measurement} type="button" onClick={() => handleAddRecommendedRow(measurement)}>
                                                            + {measurement}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="admin-product-create__size-table-wrap">
                                            <div className="admin-product-create__size-actions">
                                                {sizeGuide.type !== 'SHOES' && (
                                                    <button type="button" onClick={handleAddSizeColumn}>+ ADD SIZE</button>
                                                )}

                                                <button type="button" onClick={handleAddSizeRow}>+ ADD ROW</button>
                                            </div>

                                            {sizeGuide.columns.length > 0 && (
                                                <table className="admin-product-create__size-table">
                                                    <thead>
                                                        <tr>
                                                            <th>{sizeGuide.type === 'SHOES' ? 'KR' : 'MEASUREMENT'}</th>

                                                            {sizeGuide.columns.map((column, index) => (
                                                                <th key={index}>
                                                                    {sizeGuide.type === 'SHOES' ? (
                                                                        column
                                                                    ) : (
                                                                        <div className="admin-product-create__size-column">
                                                                            <input
                                                                                type="text"
                                                                                value={column}
                                                                                onChange={(e) => handleSizeColumnChange(index, e.target.value)}
                                                                                placeholder="S"
                                                                            />
                                                                            <button type="button" onClick={() => handleRemoveSizeColumn(index)}>×</button>
                                                                        </div>
                                                                    )}
                                                                </th>
                                                            ))}

                                                            <th></th>
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {sizeGuide.rows.map((row, rowIndex) => (
                                                            <tr key={rowIndex}>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        value={row.label}
                                                                        onChange={(e) => handleSizeRowLabelChange(rowIndex, e.target.value)}
                                                                        placeholder={sizeGuide.type === 'SHOES' ? '230' : 'LENGTH'}
                                                                    />
                                                                </td>

                                                                {row.values.map((value, valueIndex) => (
                                                                    <td key={valueIndex}>
                                                                        <input
                                                                            type="text"
                                                                            value={value}
                                                                            onChange={(e) => handleSizeValueChange(rowIndex, valueIndex, e.target.value)}
                                                                            placeholder="-"
                                                                        />
                                                                    </td>
                                                                ))}

                                                                <td>
                                                                    <button
                                                                        type="button"
                                                                        className="admin-product-create__size-remove"
                                                                        onClick={() => handleRemoveSizeRow(rowIndex)}
                                                                    >
                                                                        REMOVE
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}

                                            {sizeGuide.columns.length === 0 && (
                                                <div className="admin-product-create__size-empty">
                                                    <p>+ ADD SIZE 버튼으로 사이즈를 추가해주세요.</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="admin-product-create__size-meta">
                                            <label className="admin-product-create__field">
                                                <span>MODEL</span>
                                                <input
                                                    type="text"
                                                    value={sizeGuide.model}
                                                    onChange={(e) => setSizeGuide((prev) => ({ ...prev, model: e.target.value }))}
                                                    placeholder="예: 182cm, 60kg"
                                                />
                                            </label>

                                            <label className="admin-product-create__field">
                                                <span>WEARING SIZE</span>
                                                <input
                                                    type="text"
                                                    value={sizeGuide.wearingSize}
                                                    onChange={(e) => setSizeGuide((prev) => ({ ...prev, wearingSize: e.target.value }))}
                                                    placeholder="예: M"
                                                />
                                            </label>
                                        </div>

                                        <label className="admin-product-create__field">
                                            <span>NOTICE</span>
                                            <textarea
                                                value={sizeGuide.notice}
                                                onChange={(e) => setSizeGuide((prev) => ({ ...prev, notice: e.target.value }))}
                                                placeholder="사이즈 측정 방법 및 참고사항을 입력해주세요."
                                                rows={4}
                                            />
                                        </label>
                                    </>
                                )}
                            </div>
                        )}

                        {detailTab === 'DELIVERY' && (
                            <div className="admin-product-create__delivery">
                                {Object.values(DELIVERY_POLICY).map((section) => (
                                    <div key={section.title}>
                                        <span>{section.title}</span>
                                        <p>{section.content}</p>
                                    </div>
                                ))}
                                <p className="admin-product-create__delivery-notice">DELIVERY 내용은 모든 상품에 공통으로 적용되며 상품별로 저장하지 않습니다.</p>
                            </div>
                        )}
                    </div>
                </section>

                <div className="admin-product-create__actions">
                    <button type="button" className="admin-product-create__cancel" onClick={() => navigate(-1)} disabled={saving}>CANCEL</button>
                    <button type="submit" className="admin-product-create__submit" disabled={saving}>{saving ? 'SAVING...' : 'CREATE PRODUCT'}</button>
                </div>
            </form>
        </div>
    );
}

export default AdminProductCreatePage;