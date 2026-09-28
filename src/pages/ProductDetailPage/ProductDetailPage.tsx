import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';

import { useAuth } from '../../context/AuthContext';
import { getProductDetail } from '../../api/productApi';
import { addCartItem } from '../../api/cartApi';
import { addWishlist, checkWishlist, deleteWishlist } from '../../api/wishlistApi';
import { getImageUrl } from '../../ts/imageUrl';
import type { ProductDetailOption, ProductDetailResponse } from '../../ts/product';

import './ProductDetailPage.css';

export default function ProductDetailPage() {
    const navigate = useNavigate();
    const { member } = useAuth();
    const { productNo } = useParams();

    const [product, setProduct] = useState<ProductDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedOptionNo, setSelectedOptionNo] = useState<number | null>(null);
    const [liked, setLiked] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);

    // 상품 상세정보 조회
    useEffect(() => {
        const loadProduct = async () => {
            try {
                setLoading(true);
                setError('');

                const no = Number(productNo);
                if (!productNo || Number.isNaN(no)) throw new Error('잘못된 상품번호입니다.');

                const data = await getProductDetail(no);
                setProduct(data);
            } catch (error) {
                console.error('상품 상세조회 실패:', error);
                setError('상품 정보를 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [productNo]);

    // 로그인 회원의 현재 상품 찜 여부 조회
    useEffect(() => {
        const loadWishlistStatus = async () => {
            if (!member || !productNo) {
                setLiked(false);
                return;
            }

            const no = Number(productNo);
            if (Number.isNaN(no)) return;

            try {
                const wishlisted = await checkWishlist(member.no, no);
                setLiked(wishlisted);
            } catch (error) {
                console.error('찜 여부 조회 실패:', error);
            }
        };

        loadWishlistStatus();
    }, [member, productNo]);

    // 상품 옵션에서 중복되지 않는 색상만 추출
    const colors = useMemo(() => {
        if (!product) return [];

        return [
            ...new Set(
                product.options
                    .map((option) => option.color)
                    .filter((color): color is string => Boolean(color)),
            ),
        ];
    }, [product]);

    // 선택된 색상에 해당하는 사이즈 옵션
    const sizeOptions = useMemo(() => {
        if (!product) return [];
        if (!selectedColor) return product.options;

        return product.options.filter((option) => option.color === selectedColor);
    }, [product, selectedColor]);

    // 상품 데이터가 들어오면 첫 번째 색상을 기본 선택
    useEffect(() => {
        if (colors.length > 0 && !selectedColor) setSelectedColor(colors[0]);
    }, [colors, selectedColor]);

    // 가격 천 단위 쉼표
    const formatPrice = (price: number) => price.toLocaleString('ko-KR');

    // 색상 변경 시 기존 사이즈 선택 초기화
    const handleColorSelect = (color: string) => {
        setSelectedColor(color);
        setSelectedOptionNo(null);
    };

    // 사이즈 옵션 선택
    const handleOptionSelect = (option: ProductDetailOption) => {
        if (option.soldOut) return;
        setSelectedOptionNo(option.optionNo);
    };

    // 장바구니 추가
    const handleAddCart = async () => {
        if (!member) {
            const confirmed = window.confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?');
            if (confirmed) navigate('/login');
            return;
        }

        if (!selectedOptionNo) {
            alert('상품 옵션을 선택해주세요.');
            return;
        }

        try {
            await addCartItem({
                mno: member.no,
                pono: selectedOptionNo,
                qty: 1,
            });

            alert('장바구니에 상품을 담았습니다.');
        } catch (error) {
            console.error('장바구니 추가 실패:', error);

            if (error instanceof Error) alert(error.message);
            else alert('장바구니에 상품을 담지 못했습니다.');
        }
    };

    // 찜 등록 / 삭제
    const handleWishlist = async () => {
        if (!member) {
            const confirmed = window.confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?');
            if (confirmed) navigate('/login');
            return;
        }

        const no = Number(productNo);

        if (!productNo || Number.isNaN(no)) {
            alert('잘못된 상품번호입니다.');
            return;
        }

        try {
            setWishlistLoading(true);

            if (liked) {
                await deleteWishlist(member.no, no);
                setLiked(false);
            } else {
                await addWishlist({
                    mno: member.no,
                    pno: no,
                });

                setLiked(true);
            }
        } catch (error) {
            console.error('찜 처리 실패:', error);

            if (error instanceof Error) alert(error.message);
            else alert('찜 처리에 실패했습니다.');
        } finally {
            setWishlistLoading(false);
        }
    };

    if (loading) {
        return (
            <main className="product-detail-page">
                <div className="product-detail-loading">Loading...</div>
            </main>
        );
    }

    if (error || !product) {
        return (
            <main className="product-detail-page">
                <div className="product-detail-error">{error || '상품 정보를 찾을 수 없습니다.'}</div>
            </main>
        );
    }

    // 상단 상품 갤러리는 MAIN + SUB 이미지만 사용
    const topImages = [
        ...(product.mainImageUrl ? [product.mainImageUrl] : []),
        ...product.subImages,
    ];

    // 설명 또는 상세 이미지가 하나라도 있으면 하단 상세영역 출력
    const hasProductDetails = Boolean(product.detail?.trim()) || product.detailImages.length > 0;

    return (
        <main className="product-detail-page">
            {/* 상단 상품 영역 */}
            <section className="product-detail-top">
                {/* MAIN + SUB IMAGE */}
                <div className="product-detail-gallery">
                    {topImages.length > 0 ? (
                        <Swiper modules={[Navigation]} navigation slidesPerView={1} spaceBetween={0} className="product-detail-swiper">
                            {topImages.map((image, index) => (
                                <SwiperSlide key={`${image}-${index}`}>
                                    <div className="product-detail-image-wrap">
                                        <img src={getImageUrl(image)} alt={`${product.name} ${index + 1}`} />
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    ) : (
                        <div className="product-detail-no-image">NO IMAGE</div>
                    )}
                </div>

                {/* 상품 구매 정보 */}
                <div className="product-detail-info">
                    <p className="product-detail-brand">{product.brandName}</p>

                    <h1 className="product-detail-name">{product.name}</h1>

                    {/* 가격 */}
                    {product.discountRate > 0 ? (
                        <div className="product-detail-price">
                            <div className="product-detail-original-price">￦{formatPrice(product.price)}</div>

                            <div className="product-detail-sale-row">
                                <strong>￦{formatPrice(product.salePrice)}</strong>
                                <span>{product.discountRate}%</span>
                            </div>
                        </div>
                    ) : (
                        <div className="product-detail-price">
                            <div className="product-detail-sale-row">
                                <strong>￦{formatPrice(product.price)}</strong>
                            </div>
                        </div>
                    )}

                    {/* 상품 옵션 */}
                    {product.options.length > 0 && (
                        <div className="product-detail-options">
                            {/* COLOR */}
                            {colors.length > 0 && (
                                <div className="product-detail-option-group">
                                    <p className="product-detail-option-title">COLOR</p>

                                    <div className="product-detail-option-buttons">
                                        {colors.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                className={selectedColor === color ? 'active' : ''}
                                                onClick={() => handleColorSelect(color)}
                                            >
                                                {color}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SIZE */}
                            <div className="product-detail-option-group">
                                <p className="product-detail-option-title">SIZE</p>

                                <div className="product-detail-option-buttons">
                                    {sizeOptions.map((option) => (
                                        <button
                                            key={option.optionNo}
                                            type="button"
                                            disabled={option.soldOut}
                                            className={[
                                                selectedOptionNo === option.optionNo ? 'active' : '',
                                                option.soldOut ? 'sold-out' : '',
                                            ].filter(Boolean).join(' ')}
                                            onClick={() => handleOptionSelect(option)}
                                        >
                                            {option.sizeValue || 'ONE SIZE'}
                                            {option.soldOut && ' / SOLD OUT'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 구매 버튼 */}
                    <div className="product-detail-actions">
                        <button type="button" className="product-detail-cart" onClick={handleAddCart}>ADD TO CART</button>

                        <button
                            type="button"
                            className={`product-detail-wishlist ${liked ? 'active' : ''}`}
                            disabled={wishlistLoading}
                            onClick={handleWishlist}
                        >
                            {liked ? '♥' : '♡'} WISHLIST
                        </button>
                    </div>
                </div>
            </section>

            {/* 하단 상품 상세영역 */}
            {hasProductDetails && (
                <section className="product-detail-content">
                    {/* 상품 설명 */}
                    {product.detail && (
                        <div className="product-detail-content-description">
                            <h2>PRODUCT DETAILS</h2>
                            <p>{product.detail}</p>
                        </div>
                    )}

                    {/* 상세 이미지 */}
                    {product.detailImages.length > 0 && (
                        <div className="product-detail-content-images">
                            {product.detailImages.map((image, index) => (
                                <img key={`${image}-${index}`} src={getImageUrl(image)} alt={`${product.name} detail ${index + 1}`} />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </main>
    );
}