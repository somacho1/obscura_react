import { useEffect, useMemo, useState, useLayoutEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';

import { useAuth } from '../../context/AuthContext';
import { getProductDetail } from '../../api/productApi';
import { addCartItem } from '../../api/cartApi';
import { addWishlist, checkWishlist, deleteWishlist } from '../../api/wishlistApi';
import { DELIVERY_POLICY } from '../../data/deliveryPolicy';
import { getImageUrl } from '../../ts/imageUrl';
import type { ProductDetailOption, ProductDetailResponse } from '../../ts/product';
import './ProductDetailPage.css';

type DetailTab = 'INFO' | 'SIZE' | 'DELIVERY';

interface SizeGuide {
    type: string;
    unit: string;
    columns: string[];
    rows: { label: string; values: string[] }[];
    notice: string;
    model: string;
    wearingSize: string;
}

// 상품 상세 화면에서 선택한 옵션 한 행
interface SelectedItem {
    optionNo: number;
    color: string | null;
    sizeValue: string | null;
    qty: number;
}

// DB의 SIZEDETAIL JSON을 안전하게 읽습니다.
function parseSizeGuide(value: string | null): SizeGuide | null {
    if (!value) return null;
    try {
        const data: unknown = JSON.parse(value);
        if (!data || typeof data !== 'object') return null;
        const guide = data as Partial<SizeGuide>;
        if (!Array.isArray(guide.columns) || !guide.columns.every((column) => typeof column === 'string')) return null;
        if (!Array.isArray(guide.rows) || !guide.rows.every((row) => row && typeof row.label === 'string' && Array.isArray(row.values) && row.values.every((cell) => typeof cell === 'string'))) return null;
        return {
            type: typeof guide.type === 'string' ? guide.type : '',
            unit: typeof guide.unit === 'string' ? guide.unit : '',
            columns: guide.columns,
            rows: guide.rows,
            notice: typeof guide.notice === 'string' ? guide.notice : '',
            model: typeof guide.model === 'string' ? guide.model : '',
            wearingSize: typeof guide.wearingSize === 'string' ? guide.wearingSize : '',
        };
    } catch {
        return null;
    }
}

export default function ProductDetailPage() {
    const navigate = useNavigate();
    const { member } = useAuth();
    const { productNo } = useParams();
    const [product, setProduct] = useState<ProductDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    const [cartLoading, setCartLoading] = useState(false);
    const [liked, setLiked] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<DetailTab>('INFO');

    // 상품 상세 진입 시 화면이 표시되기 전에 맨 위로 이동합니다.
    useLayoutEffect(() => {
        const root = document.documentElement;
        const previousBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        root.style.scrollBehavior = previousBehavior;
    }, [productNo]);

    // 상품이 바뀌면 이전 상품에서 선택한 색상·옵션을 초기화합니다.
    useEffect(() => {
        const loadProduct = async () => {
            try {
                setLoading(true);
                setError('');
                setProduct(null);
                setSelectedColor('');
                setSelectedItems([]);
                setActiveTab('INFO');
                const no = Number(productNo);
                if (!productNo || !Number.isInteger(no) || no <= 0) throw new Error('잘못된 상품번호입니다.');
                setProduct(await getProductDetail(no));
            } catch (err) {
                console.error('상품 상세조회 실패:', err);
                setError('상품 정보를 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };
        loadProduct();
    }, [productNo]);

    // 로그인 회원의 찜 여부를 조회합니다.
    useEffect(() => {
        const loadWishlistStatus = async () => {
            if (!member || !productNo) { setLiked(false); return; }
            const no = Number(productNo);
            if (!Number.isInteger(no) || no <= 0) return;
            try { setLiked(await checkWishlist(member.no, no)); }
            catch (err) { console.error('찜 여부 조회 실패:', err); }
        };
        loadWishlistStatus();
    }, [member, productNo]);

    const colors = useMemo(() => {
        if (!product) return [];
        return [...new Set(product.options.map((option) => option.color).filter((color): color is string => Boolean(color)))];
    }, [product]);

    // 색상이 없는 상품은 SIZE를 바로 보여주고, 색상이 있으면 직접 고른 색상의 SIZE만 보여줍니다.
    const sizeOptions = useMemo(() => {
        if (!product) return [];
        if (colors.length === 0) return product.options;
        if (!selectedColor) return [];
        return product.options.filter((option) => option.color === selectedColor);
    }, [product, colors, selectedColor]);

    const sizeGuide = useMemo(() => parseSizeGuide(product?.sizeDetail ?? null), [product?.sizeDetail]);
    const unitPrice = product ? (product.discountRate > 0 ? product.salePrice : product.price) : 0;
    const totalQty = selectedItems.reduce((total, item) => total + item.qty, 0);
    const totalPrice = unitPrice * totalQty;
    const formatPrice = (price: number) => price.toLocaleString('ko-KR');

    // 다른 색상을 눌러도 이미 추가된 선택 목록은 유지합니다.
    const handleColorSelect = (color: string) => setSelectedColor(color);

    // SIZE 클릭 시 목록에 추가합니다. 같은 옵션을 다시 클릭하면 수량을 올립니다.
    const handleOptionSelect = (option: ProductDetailOption) => {
        if (option.soldOut) return;
        setSelectedItems((items) => {
            const existing = items.find((item) => item.optionNo === option.optionNo);
            if (existing) return items.map((item) => item.optionNo === option.optionNo ? { ...item, qty: item.qty + 1 } : item);
            return [...items, { optionNo: option.optionNo, color: option.color, sizeValue: option.sizeValue, qty: 1 }];
        });
    };

    const handleQtyChange = (optionNo: number, change: number) => {
        setSelectedItems((items) => items.map((item) =>
            item.optionNo === optionNo ? { ...item, qty: Math.max(1, item.qty + change) } : item
        ));
    };

    const handleRemoveItem = (optionNo: number) => {
        setSelectedItems((items) => items.filter((item) => item.optionNo !== optionNo));
    };

    // 옵션별 기존 API를 순서대로 호출합니다. 성공한 항목만 선택 목록에서 제거합니다.
    const handleAddCart = async () => {
        if (!member) {
            if (window.confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?')) navigate('/login');
            return;
        }
        if (selectedItems.length === 0) { alert('상품 옵션을 선택해주세요.'); return; }

        setCartLoading(true);
        const addedOptionNos: number[] = [];
        try {
            for (const item of selectedItems) {
                try {
                    await addCartItem({ mno: member.no, pono: item.optionNo, qty: item.qty });
                    addedOptionNos.push(item.optionNo);
                } catch (err) {
                    console.error('장바구니 추가 실패:', err);
                    const message = err instanceof Error ? err.message : '장바구니에 담지 못했습니다.';
                    alert(`${item.color ? `${item.color} / ` : ''}${item.sizeValue || 'ONE SIZE'} 추가 실패: ${message}`);
                    break;
                }
                
            }

            if (addedOptionNos.length > 0) {
                setSelectedItems((items) => items.filter((item) => !addedOptionNos.includes(item.optionNo)));
                // 저장 성공 후 Header 개수를 갱신합니다.
                window.dispatchEvent(new Event('cart-updated'));
                alert(`${addedOptionNos.length}개 옵션을 장바구니에 담았습니다.${addedOptionNos.length < selectedItems.length ? '\n담지 못한 옵션은 선택 목록에 남겨두었습니다.' : ''}`);
            }
        } finally {
            setCartLoading(false);
        }
    };

    // 찜 등록·삭제 동작은 기존과 동일합니다.
    const handleWishlist = async () => {
        if (!member) {
            if (window.confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?')) navigate('/login');
            return;
        }
        const no = Number(productNo);
        if (!productNo || !Number.isInteger(no) || no <= 0) { alert('잘못된 상품번호입니다.'); return; }
        try {
            setWishlistLoading(true);
            if (liked) { await deleteWishlist(member.no, no); setLiked(false); }
            else { await addWishlist({ mno: member.no, pno: no }); setLiked(true); }
        } catch (err) {
            console.error('찜 처리 실패:', err);
            alert(err instanceof Error ? err.message : '찜 처리에 실패했습니다.');
        } finally {
            setWishlistLoading(false);
        }
    };

    if (loading) return <main className="product-detail-page"><div className="product-detail-loading">Loading...</div></main>;
    if (error || !product) return <main className="product-detail-page"><div className="product-detail-error">{error || '상품 정보를 찾을 수 없습니다.'}</div></main>;

    const topImages = [...(product.mainImageUrl ? [product.mainImageUrl] : []), ...product.subImages];

    return (
        <main className="product-detail-page">
            <section className="product-detail-top">
                {/* 대표·서브 이미지: 원본 비율로 표시 */}
                <div className="product-detail-gallery">
                    {topImages.length > 0 ? (
                        <Swiper modules={[Navigation]} navigation={topImages.length > 1} slidesPerView={1} spaceBetween={0} className="product-detail-swiper">
                            {topImages.map((image, index) => (
                                <SwiperSlide key={`${image}-${index}`}>
                                    <div className="product-detail-image-wrap"><img src={getImageUrl(image)} alt={`${product.name} ${index + 1}`} /></div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    ) : <div className="product-detail-no-image">NO IMAGE</div>}
                </div>

                <div className="product-detail-info">
                    <p className="product-detail-brand">{product.brandName}</p>
                    <h1 className="product-detail-name">{product.name}</h1>
                    {product.code && <p className="product-detail-code"><span>CODE</span><strong>{product.code}</strong></p>}

                    <div className="product-detail-price">
                        {product.discountRate > 0 && <span className="product-detail-original-price">₩{formatPrice(product.price)}</span>}
                        <div className="product-detail-sale-row">
                            <strong>₩{formatPrice(unitPrice)}</strong>
                            {product.discountRate > 0 && <span>{product.discountRate}% OFF</span>}
                        </div>
                    </div>

                    <p className="product-detail-shipping"><span>SHIPPING</span><strong>₩3,500</strong><small>₩60,000 이상 구매 시 무료</small></p>

                    {product.options.length > 0 && (
                        <div className="product-detail-options">
                            {colors.length > 0 && (
                                <div className="product-detail-option-group">
                                    <p className="product-detail-option-title">COLOR</p>
                                    <div className="product-detail-option-buttons">
                                        {colors.map((color) => (
                                            <button key={color} type="button" className={selectedColor === color ? 'active' : ''} aria-pressed={selectedColor === color} onClick={() => handleColorSelect(color)}>{color}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="product-detail-option-group">
                                <p className="product-detail-option-title">SIZE</p>
                                {colors.length > 0 && !selectedColor
                                    ? <p className="product-detail-option-hint">먼저 COLOR를 선택해 주세요.</p>
                                    : <div className="product-detail-option-buttons">
                                        {sizeOptions.map((option) => (
                                            <button key={option.optionNo} type="button" disabled={option.soldOut} onClick={() => handleOptionSelect(option)}>
                                                {option.sizeValue || 'ONE SIZE'}{option.soldOut && ' / SOLD OUT'}
                                            </button>
                                        ))}
                                    </div>}
                            </div>
                        </div>
                    )}

                    {/* 여러 색상·사이즈를 추가할 수 있는 선택 목록 */}
                    {selectedItems.length > 0 && (
                        <div className="product-detail-selected" aria-label="선택한 상품 옵션">
                            {selectedItems.map((item) => (
                                <div className="product-detail-selected-row" key={item.optionNo}>
                                    <div className="product-detail-selected-name">
                                        <strong>{item.color || '기본 색상'} / {item.sizeValue || 'ONE SIZE'}</strong>
                                        <span>₩{formatPrice(unitPrice * item.qty)}</span>
                                    </div>
                                    <div className="product-detail-selected-controls">
                                        <button type="button" onClick={() => handleQtyChange(item.optionNo, -1)} disabled={cartLoading || item.qty <= 1} aria-label={`${item.sizeValue || 'ONE SIZE'} 수량 감소`}>−</button>
                                        <span>{item.qty}</span>
                                        <button type="button" onClick={() => handleQtyChange(item.optionNo, 1)} disabled={cartLoading} aria-label={`${item.sizeValue || 'ONE SIZE'} 수량 증가`}>+</button>
                                        <button type="button" className="product-detail-selected-remove" onClick={() => handleRemoveItem(item.optionNo)} disabled={cartLoading} aria-label={`${item.sizeValue || 'ONE SIZE'} 선택 삭제`}>×</button>
                                    </div>
                                </div>
                            ))}
                            <div className="product-detail-selected-total"><span>TOTAL ({totalQty}개)</span><strong>₩{formatPrice(totalPrice)}</strong></div>
                        </div>
                    )}

                    <div className="product-detail-actions">
                        <button type="button" className="product-detail-cart" onClick={handleAddCart} disabled={cartLoading}>{cartLoading ? 'ADDING...' : 'ADD TO CART'}</button>
                        <button type="button" className={`product-detail-wishlist ${liked ? 'active' : ''}`} disabled={wishlistLoading} onClick={handleWishlist}>
                            <span className="product-detail-heart" aria-hidden="true">{liked ? '♥' : '♡'}</span><span>WISHLIST</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* 탭에서 정보를 확인한 다음 상세 이미지를 봅니다. */}
            <section className="product-detail-content" aria-label="상품 상세 안내">
                <nav className="product-detail-tabs" aria-label="상세 정보 탭">
                    {(['INFO', 'SIZE', 'DELIVERY'] as const).map((tab) => (
                        <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)} aria-pressed={activeTab === tab}>{tab}</button>
                    ))}
                </nav>

                {activeTab === 'INFO' && (
                    <div className="product-detail-tab-panel">
                        <h2>PRODUCT INFO</h2>
                        {product.detail?.trim()
                            ? <p className="product-detail-description">{product.detail}</p>
                            : <p className="product-detail-empty">등록된 상품 설명이 없습니다.</p>}
                    </div>
                )}

                {activeTab === 'SIZE' && (
                    <div className="product-detail-tab-panel">
                        <h2>SIZE GUIDE</h2>
                        {sizeGuide && sizeGuide.type !== 'NONE' && sizeGuide.columns.length > 0 && sizeGuide.rows.length > 0 ? (
                            <>
                                <div className="product-detail-size-scroll">
                                    <table className="product-detail-size-table">
                                        <thead><tr><th scope="col">{sizeGuide.unit ? `단위: ${sizeGuide.unit}` : 'SIZE'}</th>{sizeGuide.columns.map((column, index) => <th scope="col" key={`${column}-${index}`}>{column}</th>)}</tr></thead>
                                        <tbody>{sizeGuide.rows.map((row, index) => <tr key={`${row.label}-${index}`}><th scope="row">{row.label}</th>{sizeGuide.columns.map((_, cellIndex) => <td key={cellIndex}>{row.values[cellIndex] || '—'}</td>)}</tr>)}</tbody>
                                    </table>
                                </div>
                                {sizeGuide.notice && <p className="product-detail-size-note">{sizeGuide.notice}</p>}
                                {sizeGuide.model && <p className="product-detail-size-meta"><strong>MODEL</strong> {sizeGuide.model}</p>}
                                {sizeGuide.wearingSize && <p className="product-detail-size-meta"><strong>WEARING SIZE</strong> {sizeGuide.wearingSize}</p>}
                            </>
                        ) : <p className="product-detail-empty">등록된 사이즈 가이드가 없습니다.</p>}
                    </div>
                )}

                {activeTab === 'DELIVERY' && (
                    <div className="product-detail-tab-panel">
                        {Object.values(DELIVERY_POLICY).map((section) => (
                            <section className="product-detail-policy" key={section.title}>
                                <h2>{section.title}</h2>
                                <p>{section.content}</p>
                            </section>
                        ))}
                    </div>
                )}

                {product.detailImages.length > 0 && (
                    <div className="product-detail-content-images">
                        {product.detailImages.map((image, index) => <img key={`${image}-${index}`} src={getImageUrl(image)} alt={`${product.name} 상세 이미지 ${index + 1}`} loading="lazy" />)}
                    </div>
                )}
            </section>
        </main>
    );
}