import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';
import 'swiper/css/navigation';

import { getProductDetail } from '../../api/productApi';
import { addCartItem } from '../../api/cartApi';

import type { ProductDetailOption, ProductDetailResponse } from '../../ts/product';

import { addWishlist, checkWishlist, deleteWishlist, } from '../../api/wishlistApi';

import './ProductDetailPage.css';

export default function ProductDetailPage() {
    const navigate = useNavigate();
    const { member } = useAuth();
    const { productNo } = useParams();

    const [product, setProduct] =
        useState<ProductDetailResponse | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // 사용자가 선택한 색상
    const [selectedColor, setSelectedColor] =
        useState<string>('');

    // 사용자가 선택한 상품옵션번호
    const [selectedOptionNo, setSelectedOptionNo] =
        useState<number | null>(null);

    // 찜 UI
    const [liked, setLiked] = useState(false);

    // 찜 처리 중 여부
    const [wishlistLoading, setWishlistLoading] = useState(false);

    /**
     * 상품 상세정보 조회
     */
    useEffect(() => {
        const loadProduct = async () => {
            try {
                setLoading(true);
                setError('');

                const no = Number(productNo);

                if (!productNo || Number.isNaN(no)) {
                    throw new Error(
                        '잘못된 상품번호입니다.',
                    );
                }

                const data =
                    await getProductDetail(no);

                setProduct(data);
            } catch (error) {
                console.error(
                    '상품 상세조회 실패:',
                    error,
                );

                setError(
                    '상품 정보를 불러오지 못했습니다.',
                );
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [productNo]);

    /**
 * 현재 상품 찜 여부 조회
 */
    useEffect(() => {
        const loadWishlistStatus = async () => {
            // 로그인하지 않았거나 상품번호가 없는 경우
            if (!member || !productNo) {
                setLiked(false);
                return;
            }

            const no = Number(productNo);

            if (Number.isNaN(no)) {
                return;
            }

            try {
                const wishlisted =
                    await checkWishlist(
                        member.no,
                        no,
                    );

                setLiked(wishlisted);
            } catch (error) {
                console.error(
                    '찜 여부 조회 실패:',
                    error,
                );
            }
        };

        loadWishlistStatus();
    }, [member, productNo]);

    /**
     * 옵션에 존재하는 색상 목록
     *
     * BLACK / M
     * BLACK / L
     * WHITE / M
     *
     * 같은 데이터가 들어와도
     * BLACK, WHITE만 화면에 표시한다.
     */
    const colors = useMemo(() => {
        if (!product) {
            return [];
        }

        return [
            ...new Set(
                product.options
                    .map((option) => option.color)
                    .filter(
                        (color): color is string =>
                            Boolean(color),
                    ),
            ),
        ];
    }, [product]);

    /**
     * 현재 선택한 색상에 해당하는 옵션
     */
    const sizeOptions = useMemo(() => {
        if (!product) {
            return [];
        }

        if (!selectedColor) {
            return product.options;
        }

        return product.options.filter(
            (option) =>
                option.color === selectedColor,
        );
    }, [product, selectedColor]);

    /**
     * 상품 데이터가 들어오면
     * 첫 번째 색상을 기본 선택한다.
     */
    useEffect(() => {
        if (
            colors.length > 0 &&
            !selectedColor
        ) {
            setSelectedColor(colors[0]);
        }
    }, [colors, selectedColor]);

    /**
     * 가격 천 단위 쉼표
     */
    const formatPrice = (price: number) =>
        price.toLocaleString('ko-KR');

    /**
     * 색상 변경
     *
     * 색상이 변경되면 기존 사이즈 선택을 해제한다.
     */
    const handleColorSelect = (
        color: string,
    ) => {
        setSelectedColor(color);
        setSelectedOptionNo(null);
    };

    /**
     * 사이즈 옵션 선택
     */
    const handleOptionSelect = (
        option: ProductDetailOption,
    ) => {
        if (option.soldOut) {
            return;
        }

        setSelectedOptionNo(option.optionNo);
    };

    /**
 * 장바구니 버튼
 *
 * 로그인한 회원의 장바구니에
 * 선택한 상품 옵션을 추가한다.
 */
    const handleAddCart = async () => {
        // 로그인 확인
        if (!member) {
            const confirmed = window.confirm(
                '로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?',
            );

            if (confirmed) {
                navigate('/login');
            }

            return;
        }

        // 옵션 선택 확인
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
            console.error(
                '장바구니 추가 실패:',
                error,
            );

            if (error instanceof Error) {
                alert(error.message);
            } else {
                alert(
                    '장바구니에 상품을 담지 못했습니다.',
                );
            }
        }
    };

    /**
 * 찜 등록 / 삭제
 */
    const handleWishlist = async () => {
        // 로그인 확인
        if (!member) {
            const confirmed = window.confirm(
                '로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?',
            );

            if (confirmed) {
                navigate('/login');
            }

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
                // 이미 찜한 상품이면 삭제
                await deleteWishlist(
                    member.no,
                    no,
                );

                setLiked(false);
            } else {
                // 찜하지 않은 상품이면 등록
                await addWishlist({
                    mno: member.no,
                    pno: no,
                });

                setLiked(true);
            }
        } catch (error) {
            console.error(
                '찜 처리 실패:',
                error,
            );

            if (error instanceof Error) {
                alert(error.message);
            } else {
                alert(
                    '찜 처리에 실패했습니다.',
                );
            }
        } finally {
            setWishlistLoading(false);
        }
    };

    /**
     * 상품정보 로딩 중
     */
    if (loading) {
        return (
            <main className="product-detail-page">
                <div className="product-detail-loading">
                    Loading...
                </div>
            </main>
        );
    }

    /**
     * 상품조회 실패 또는 상품정보가 없는 경우
     */
    if (error || !product) {
        return (
            <main className="product-detail-page">
                <div className="product-detail-error">
                    {error || '상품 정보를 찾을 수 없습니다.'}
                </div>
            </main>
        );
    }

    /**
     * 상단 슬라이드:
     * MAIN + SUB만 사용
     *
     * DETAIL 이미지는 아래 상세영역에서 별도로 출력한다.
     */
    const topImages = [
        ...(product.mainImageUrl
            ? [product.mainImageUrl]
            : []),
        ...product.subImages,
    ];

    return (
        <main className="product-detail-page">
            {/* 상단 상품 영역 */}
            <section className="product-detail-top">
                {/* MAIN + SUB 이미지 */}
                <div className="product-detail-gallery">
                    {topImages.length > 0 ? (
                        <Swiper
                            modules={[Navigation]}
                            navigation
                            slidesPerView={1}
                            spaceBetween={0}
                            className="product-detail-swiper"
                        >
                            {topImages.map(
                                (image, index) => (
                                    <SwiperSlide
                                        key={`${image}-${index}`}
                                    >
                                        <div className="product-detail-image-wrap">
                                            <img
                                                src={
                                                    image
                                                }
                                                alt={`${product.name} ${index + 1}`}
                                            />
                                        </div>
                                    </SwiperSlide>
                                ),
                            )}
                        </Swiper>
                    ) : (
                        <div className="product-detail-no-image">
                            NO IMAGE
                        </div>
                    )}
                </div>

                {/* 상품정보 */}
                <div className="product-detail-info">
                    <p className="product-detail-brand">
                        {product.brandName}
                    </p>

                    <h1 className="product-detail-name">
                        {product.name}
                    </h1>

                    {/* 가격 */}
                    {product.discountRate > 0 ? (
                        <div className="product-detail-price">
                            <div className="product-detail-original-price">
                                ￦
                                {formatPrice(
                                    product.price,
                                )}
                            </div>

                            <div className="product-detail-sale-row">
                                <strong>
                                    ￦
                                    {formatPrice(
                                        product.salePrice,
                                    )}
                                </strong>

                                <span>
                                    {
                                        product.discountRate
                                    }
                                    %
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="product-detail-price">
                            <div className="product-detail-sale-row">
                                <strong>
                                    ￦
                                    {formatPrice(
                                        product.price,
                                    )}
                                </strong>
                            </div>
                        </div>
                    )}

                    {product.detail && (
                        <p className="product-detail-description">
                            {product.detail}
                        </p>
                    )}

                    {/* 상품 옵션이 존재하는 경우 */}
                    {product.options.length >
                        0 && (
                            <div className="product-detail-options">
                                {/* COLOR */}
                                {colors.length > 0 && (
                                    <div className="product-detail-option-group">
                                        <p className="product-detail-option-title">
                                            COLOR
                                        </p>

                                        <div className="product-detail-option-buttons">
                                            {colors.map(
                                                (color) => (
                                                    <button
                                                        key={
                                                            color
                                                        }
                                                        type="button"
                                                        className={
                                                            selectedColor ===
                                                                color
                                                                ? 'active'
                                                                : ''
                                                        }
                                                        onClick={() =>
                                                            handleColorSelect(
                                                                color,
                                                            )
                                                        }
                                                    >
                                                        {
                                                            color
                                                        }
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* SIZE */}
                                <div className="product-detail-option-group">
                                    <p className="product-detail-option-title">
                                        SIZE
                                    </p>

                                    <div className="product-detail-option-buttons">
                                        {sizeOptions.map(
                                            (option) => (
                                                <button
                                                    key={
                                                        option.optionNo
                                                    }
                                                    type="button"
                                                    disabled={
                                                        option.soldOut
                                                    }
                                                    className={[
                                                        selectedOptionNo ===
                                                            option.optionNo
                                                            ? 'active'
                                                            : '',
                                                        option.soldOut
                                                            ? 'sold-out'
                                                            : '',
                                                    ]
                                                        .filter(
                                                            Boolean,
                                                        )
                                                        .join(
                                                            ' ',
                                                        )}
                                                    onClick={() =>
                                                        handleOptionSelect(
                                                            option,
                                                        )
                                                    }
                                                >
                                                    {option.sizeValue ||
                                                        'ONE SIZE'}

                                                    {option.soldOut &&
                                                        ' / SOLD OUT'}
                                                </button>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                    {/* 구매 버튼 */}
                    <div className="product-detail-actions">
                        <button
                            type="button"
                            className="product-detail-cart"
                            onClick={
                                handleAddCart
                            }
                        >
                            ADD TO CART
                        </button>
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

            {/* 하단 상세 이미지 */}
            {product.detailImages.length >
                0 && (
                    <section className="product-detail-content">
                        {product.detailImages.map(
                            (image, index) => (
                                <img
                                    key={`${image}-${index}`}
                                    src={image}
                                    alt={`${product.name} detail ${index + 1}`}
                                />
                            ),
                        )}
                    </section>
                )}
        </main>
    );
}