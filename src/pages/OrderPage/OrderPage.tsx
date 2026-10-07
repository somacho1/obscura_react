import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { applyBankPayment } from '../../api/paymentApi';
import { openTossPayment } from '../../ts/tossPayment';
import { getCartItems } from '../../api/cartApi';
import { getMemberAddresses } from '../../api/memberAddressApi';
import { cancelPendingOrder, createOrder } from '../../api/orderApi';
import { useAuth } from '../../context/AuthContext';
import type { CartItemDetailResponse } from '../../ts/cart';
import type { MemberAddressResponse } from '../../ts/memberAddress';
import type { PostcodeAddress } from '../../ts/postcode';
import type { OrderResponse } from '../../ts/order';
import { getImageUrl } from '../../ts/imageUrl';
import './OrderPage.css';


// 화면에서는 예상 금액을 표시하고, 최종 금액은 서버에서 확정합니다.
const SHIPPING_FEE = 3500;
const FREE_SHIPPING_MIN = 60000;

interface DeliveryForm {
    receiver: string;
    phone: string;
    zipcode: string;
    address1: string;
    address2: string;
}

const EMPTY_DELIVERY: DeliveryForm = { receiver: '', phone: '', zipcode: '', address1: '', address2: '' };

// 저장된 회원 배송지를 주문서 입력값으로 변환합니다.
function toDeliveryForm(address: MemberAddressResponse): DeliveryForm {
    return {
        receiver: address.receiver,
        phone: address.phone,
        zipcode: address.zipcode,
        address1: address.address1,
        address2: address.address2 ?? '',
    };
}

export default function OrderPage() {
    const navigate = useNavigate();
    const { member } = useAuth();
    const [searchParams] = useSearchParams();
    const cartItemNosParam = searchParams.get('cartItemNos') ?? '';
    const memberNo = member?.no;
    const memberName = member?.name ?? '';

    const [items, setItems] = useState<CartItemDetailResponse[]>([]);
    const [addresses, setAddresses] = useState<MemberAddressResponse[]>([]);
    const [addressNo, setAddressNo] = useState('');
    const [delivery, setDelivery] = useState<DeliveryForm>({ ...EMPTY_DELIVERY });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formError, setFormError] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const [orderLoading, setOrderLoading] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false); // 취소 요청 중 중복 클릭 방지
    const [createdOrder, setCreatedOrder] = useState<OrderResponse | null>(null);

    // 기본 결제수단은 카드 / 간편결제입니다.
    const [paymentMethod, setPaymentMethod] = useState<'TOSS' | 'BANK'>('TOSS');

    // 무통장입금 선택 시 입력한 입금자명을 저장합니다.
    const [depositor, setDepositor] = useState('');

    // 상태가 화면에 반영되기 전 연속으로 발생하는 제출도 막습니다.
    const submittingRef = useRef(false);
    const formLocked = orderLoading || createdOrder !== null;

    // 주문서에 진입하면 맨 위에서 시작합니다.
    useLayoutEffect(() => {
        const root = document.documentElement;
        const previousBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        root.style.scrollBehavior = previousBehavior;
    }, []);

    // URL에는 장바구니 번호만 받고 상품·수량·가격은 서버에서 조회합니다.
    useEffect(() => {
        let cancelled = false;
        setItems([]);
        setAddresses([]);
        setAddressNo('');
        setDelivery({ ...EMPTY_DELIVERY });
        setError('');
        setFormError('');
        setCreatedOrder(null);

        if (memberNo === undefined) {
            setLoading(false);
            return;
        }

        const currentMemberNo = memberNo;
        setLoading(true);

        async function loadOrderForm() {
            try {
                const tokens = cartItemNosParam.split(',');
                if (!cartItemNosParam || tokens.some(token => !/^[1-9]\d*$/.test(token))) {
                    throw new Error('주문할 상품을 장바구니에서 선택해주세요.');
                }

                const selectedNos = tokens.map(Number);
                if (selectedNos.some(no => !Number.isSafeInteger(no)) || new Set(selectedNos).size !== selectedNos.length) {
                    throw new Error('잘못된 주문 상품 정보입니다. 장바구니에서 다시 선택해주세요.');
                }

                // 장바구니와 저장된 배송지를 함께 조회합니다.
                const [cartItems, savedAddresses] = await Promise.all([
                    getCartItems(currentMemberNo),
                    getMemberAddresses(currentMemberNo),
                ]);
                if (cancelled) return;

                const selectedSet = new Set(selectedNos);
                const selectedItems = cartItems.filter(item => selectedSet.has(item.cartItemNo));

                // 장바구니에서 삭제되었거나 조회할 수 없는 항목은 주문하지 않습니다.
                if (selectedItems.length !== selectedNos.length) {
                    throw new Error('선택한 상품이 장바구니에서 변경되었습니다. 다시 선택해주세요.');
                }

                const unavailable = selectedItems.find(item => item.soldOut || item.qty < 1 || item.qty > item.stockQty);
                if (unavailable) {
                    throw new Error(`${unavailable.productName} 상품이 품절이거나 재고가 부족합니다. 장바구니를 확인해주세요.`);
                }

                setItems(selectedItems);
                setAddresses(savedAddresses);

                // 기본배송지가 없으면 받는 사람만 회원 이름으로 입력합니다.
                const defaultAddress = savedAddresses.find(address => address.defaultYn === 'Y');
                if (defaultAddress) {
                    setAddressNo(String(defaultAddress.no));
                    setDelivery(toDeliveryForm(defaultAddress));
                } else {
                    setDelivery({ ...EMPTY_DELIVERY, receiver: memberName });
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : '주문서 정보를 불러오지 못했습니다.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadOrderForm();
        return () => { cancelled = true; };
    }, [memberNo, memberName, cartItemNosParam, retryCount]);

    // 저장된 배송지를 선택하거나 직접 입력으로 전환합니다.
    const handleAddressChange = (value: string) => {
        if (formLocked) return;
        setAddressNo(value);
        setFormError('');
        const address = addresses.find(item => String(item.no) === value);
        setDelivery(address ? toDeliveryForm(address) : { ...EMPTY_DELIVERY, receiver: memberName });
    };

    // 저장된 배송지를 편집하면 변경된 내용을 직접 입력 주소로 보냅니다.
    const updateDelivery = (field: keyof DeliveryForm, value: string) => {
        if (formLocked) return;
        setAddressNo('');
        setFormError('');
        setDelivery(current => ({ ...current, [field]: value }));
    };

    // 연락처는 숫자와 하이픈만 허용합니다.
    const handlePhoneChange = (value: string) => {
        updateDelivery('phone', value.replace(/[^\d-]/g, '').slice(0, 20));
    };

    // 주소 검색 결과를 입력하고 상세주소 입력란으로 이동합니다.
    const handleAddressSearch = () => {
        if (formLocked) return;
        if (!window.kakao?.Postcode) {
            setFormError('주소 검색 서비스를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
            return;
        }

        setFormError('');
        new window.kakao.Postcode({
            oncomplete: (data: PostcodeAddress) => {
                // 주소 검색창이 열린 동안 주문을 제출했다면 입력값을 변경하지 않습니다.
                if (submittingRef.current) return;

                const isRoad = data.userSelectedType === 'R';
                let address = isRoad ? data.roadAddress : data.jibunAddress;

                // 도로명 주소에는 법정동과 공동주택명을 참고정보로 표시합니다.
                if (isRoad) {
                    const extra: string[] = [];
                    if (data.bname && /[동로가]$/.test(data.bname)) extra.push(data.bname);
                    if (data.buildingName && data.apartment === 'Y') extra.push(data.buildingName);
                    if (extra.length > 0) address += ` (${extra.join(', ')})`;
                }

                setAddressNo('');
                setDelivery(current => ({ ...current, zipcode: data.zonecode, address1: address, address2: '' }));
                window.requestAnimationFrame(() => document.getElementById('order-address2')?.focus());
            },
        }).open();
    };

    const productTotal = items.reduce((total, item) => total + item.salePrice * item.qty, 0);
    const shippingFee = items.length === 0 || productTotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
    const paymentTotal = productTotal + shippingFee;

    // 배송지 검증 → 주문 생성 → 선택한 결제수단 연결 순서로 진행합니다.
    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submittingRef.current || createdOrder) return;
        if (!member) { setFormError('로그인 후 주문해주세요.'); return; }
        if (items.length === 0) { setFormError('주문할 상품이 없습니다.'); return; }

        const receiver = delivery.receiver.trim();
        const phone = delivery.phone.trim();
        const zipcode = delivery.zipcode.trim();
        const address1 = delivery.address1.trim();
        const address2 = delivery.address2.trim();
        const depositorName = depositor.trim();

        if (!receiver) { setFormError('받는 사람을 입력해주세요.'); return; }
        if (!/^0\d{8,10}$/.test(phone.replace(/-/g, ''))) { setFormError('올바른 연락처를 입력해주세요.'); return; }
        if (!/^\d{5}$/.test(zipcode)) { setFormError('주소 검색으로 우편번호를 입력해주세요.'); return; }
        if (!address1) { setFormError('기본주소를 입력해주세요.'); return; }

        // 무통장입금은 주문 생성 전에 입금자명도 검증합니다.
        if (paymentMethod === 'BANK') {
            if (!depositorName) { setFormError('입금자명을 입력해주세요.'); return; }
            if (new TextEncoder().encode(depositorName).length > 50) {
                setFormError('입금자명이 너무 깁니다. 한글 기준 약 16자 이내로 입력해주세요.');
                return;
            }
        }

        // 주문 생성부터 결제 연결까지 중복 제출을 막습니다.
        submittingRef.current = true;
        setOrderLoading(true);
        setFormError('');

        // 주문 생성 후 결제만 실패한 경우에도 생성된 주문을 유지합니다.
        let savedOrder: OrderResponse | null = null;

        try {
            const order = await createOrder({
                mno: member.no,
                cartItemNos: items.map(item => item.cartItemNo),
                delivery: {
                    // 저장된 배송지의 소유 회원과 주소는 서버에서 확인합니다.
                    ...(addressNo ? { madno: Number(addressNo) } : {}),
                    receiver, phone, zipcode, address1, address2,
                },
            });

            savedOrder = order;
            setCreatedOrder(order);

            // 주문한 장바구니 항목이 제거됐으므로 Header 개수를 갱신합니다.
            window.dispatchEvent(new Event('cart-updated'));

            if (paymentMethod === 'BANK') {
                // 무통장입금 신청은 입금 대기로 저장하며 결제 완료로 처리하지 않습니다.
                await applyBankPayment({
                    mno: member.no,
                    ordno: order.no,
                    depositor: depositorName,
                });

                // 주문 상세에서 저장된 입금자명·금액·입금 대기 안내를 표시합니다.
                navigate(`/orders/${order.no}`, { replace: true });
            } else {
                // 서버에서 확정한 주문 금액으로 Toss 결제창을 엽니다.
                await openTossPayment(order, member.no);

                // 페이지 이동 없이 결제창 호출이 종료되면 주문 상세로 안내합니다.
                navigate(`/orders/${order.no}`, { replace: true });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.';

            if (savedOrder) {
                // 결제 중단만으로 주문을 자동 취소하거나 같은 주문을 다시 생성하지 않습니다.
                setFormError(`주문번호 ${savedOrder.no}이 생성되었습니다. ${message} 생성된 주문의 상세 화면에서 결제를 이어가주세요.`);
            } else {
                setFormError(message);
            }
        } finally {
            setOrderLoading(false);
            submittingRef.current = false;
        }
    };

    // 결제 대기 주문을 취소하고 서버에서 반환한 취소 상태를 표시합니다.
    const handleCancelOrder = async () => {
        if (!member || !createdOrder || createdOrder.statusNo !== 1 || submittingRef.current) return;
        if (!window.confirm('주문을 취소하시겠습니까?')) return;

        submittingRef.current = true;
        setCancelLoading(true);
        setFormError('');

        try {
            const cancelledOrder = await cancelPendingOrder(createdOrder.no, member.no);
            setCreatedOrder(cancelledOrder);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : '주문 취소에 실패했습니다.');
        } finally {
            setCancelLoading(false);
            submittingRef.current = false;
        }
    };

    if (!member) {
        return (
            <main className="order-page">
                <div className="order-state"><p>로그인이 필요한 서비스입니다.</p><Link to="/login">LOGIN</Link></div>
            </main>
        );
    }

    if (loading) {
        return <main className="order-page"><div className="order-state" role="status">주문서 정보를 불러오는 중입니다.</div></main>;
    }

    if (error) {
        return (
            <main className="order-page">
                <div className="order-state" role="alert">
                    <p>{error}</p>
                    <div className="order-state-actions">
                        <Link to="/cart">장바구니로 돌아가기</Link>
                        <button type="button" onClick={() => setRetryCount(count => count + 1)}>다시 조회</button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="order-page">
            <div className="order-container">
                <header className="order-heading">
                    <h1>ORDER</h1>
                    <span>CART → ORDER → PAYMENT</span>
                </header>

                <form className="order-layout" onSubmit={handleSubmit}>
                    <div className="order-sections">
                        {/* 선택한 상품만 표시하고 수량 변경은 주문 생성 전에 장바구니에서 처리합니다. */}
                        <section className="order-section">
                            <div className="order-section-heading">
                                <h2>주문 상품 <span>{items.length}</span></h2>
                                {!formLocked && <Link to="/cart">장바구니에서 수정</Link>}
                            </div>
                            <div className="order-products">
                                {items.map(item => (
                                    <article className="order-product" key={item.cartItemNo}>
                                        <Link className="order-product-image" to={`/products/${item.productNo}`}>
                                            {item.mainImageUrl ? <img src={getImageUrl(item.mainImageUrl)} alt={item.productName} /> : <span>NO IMAGE</span>}
                                        </Link>
                                        <div className="order-product-info">
                                            <p className="order-product-brand">{item.brandName}</p>
                                            <Link className="order-product-name" to={`/products/${item.productNo}`}>{item.productName}</Link>
                                            <p className="order-product-option">COLOR: {item.color || '-'} / SIZE: {item.sizeValue || '-'}</p>
                                            <p className="order-product-qty">수량 {item.qty}개</p>
                                        </div>
                                        <strong className="order-product-price">{(item.salePrice * item.qty).toLocaleString('ko-KR')}원</strong>
                                    </article>
                                ))}
                            </div>
                        </section>

                        {/* 주문 생성 이후에는 주문 당시 배송지 입력값을 유지합니다. */}
                        <section className="order-section">
                            <div className="order-section-heading"><h2>배송지 정보</h2></div>
                            <div className="order-delivery-form">
                                <div className="order-field">
                                    <label htmlFor="order-address-select">배송지 선택</label>
                                    <select id="order-address-select" value={addressNo} disabled={formLocked} onChange={event => handleAddressChange(event.target.value)}>
                                        <option value="">직접 입력</option>
                                        {addresses.map(address => (
                                            <option key={address.no} value={address.no}>
                                                {address.addressName || '배송지'} · {address.receiver}{address.defaultYn === 'Y' ? ' (기본배송지)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="order-field-row">
                                    <div className="order-field">
                                        <label htmlFor="order-receiver">받는 사람 <span>*</span></label>
                                        <input id="order-receiver" value={delivery.receiver} maxLength={50} autoComplete="shipping name" required disabled={formLocked} onChange={event => updateDelivery('receiver', event.target.value)} />
                                    </div>
                                    <div className="order-field">
                                        <label htmlFor="order-phone">연락처 <span>*</span></label>
                                        <input id="order-phone" type="tel" value={delivery.phone} placeholder="010-0000-0000" maxLength={20} autoComplete="shipping tel" required disabled={formLocked} onChange={event => handlePhoneChange(event.target.value)} />
                                    </div>
                                </div>

                                {/* 우편번호와 기본주소는 주소 검색 결과를 사용합니다. */}
                                <div className="order-field">
                                    <label htmlFor="order-zipcode">우편번호 <span>*</span></label>
                                    <div className="order-address-search">
                                        <input id="order-zipcode" value={delivery.zipcode} placeholder="우편번호" readOnly autoComplete="shipping postal-code" />
                                        <button type="button" disabled={formLocked} onClick={handleAddressSearch}>주소 검색</button>
                                    </div>
                                </div>
                                <div className="order-field">
                                    <label htmlFor="order-address1">기본주소 <span>*</span></label>
                                    <input id="order-address1" value={delivery.address1} placeholder="주소 검색 버튼으로 입력해주세요." readOnly autoComplete="shipping address-line1" />
                                </div>
                                <div className="order-field">
                                    <label htmlFor="order-address2">상세주소</label>
                                    <input id="order-address2" value={delivery.address2} placeholder="동·호수 등 상세주소" maxLength={255} autoComplete="shipping address-line2" disabled={formLocked} onChange={event => updateDelivery('address2', event.target.value)} />
                                </div>
                                <p className="order-field-note">배송에 필요한 상세주소가 있다면 함께 입력해주세요.</p>
                                {formError && <p className="order-form-error" role="alert">{formError}</p>}
                            </div>
                        </section>

                        {/* 주문 생성 전에 결제수단을 선택합니다. 생성 후에는 변경을 막습니다. */}
                        <section className="order-section">
                            <div className="order-section-heading"><h2>결제수단</h2></div>
                            <div className="order-payment-methods">
                                <button type="button" className={paymentMethod === 'TOSS' ? 'active' : ''} aria-pressed={paymentMethod === 'TOSS'} disabled={formLocked} onClick={() => { setPaymentMethod('TOSS'); setFormError(''); }}>
                                    카드 / 간편결제
                                </button>
                                <button type="button" className={paymentMethod === 'BANK' ? 'active' : ''} aria-pressed={paymentMethod === 'BANK'} disabled={formLocked} onClick={() => { setPaymentMethod('BANK'); setFormError(''); }}>
                                    무통장입금
                                </button>
                            </div>

                            {/* 무통장입금을 선택한 경우에만 입금자명을 입력합니다. */}
                            {paymentMethod === 'BANK' && (
                                <div className="order-bank-form">
                                    <div className="order-field">
                                        <label htmlFor="order-depositor">입금자명 <span>*</span></label>
                                        <input id="order-depositor" value={depositor} maxLength={50} placeholder="입금자명을 입력해주세요." required disabled={formLocked} onChange={event => setDepositor(event.target.value)} />
                                    </div>
                                    <p className="order-field-note">신청 후 입금 대기 상태로 저장됩니다. 개인 프로젝트 테스트용으로 실제 송금하지 마세요.</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* 주문 생성 후에는 서버에서 확정한 금액을 표시합니다. */}
                    <aside className="order-summary">
                        <h2>ORDER SUMMARY</h2>
                        <div className="order-summary-row">
                            <span>상품 금액</span>
                            <span>{(createdOrder ? createdOrder.totalPrice - createdOrder.shippingFee : productTotal).toLocaleString('ko-KR')}원</span>
                        </div>
                        <div className="order-summary-row">
                            <span>배송비</span>
                            <span>{(createdOrder?.shippingFee ?? shippingFee) === 0 ? '무료' : `${(createdOrder?.shippingFee ?? shippingFee).toLocaleString('ko-KR')}원`}</span>
                        </div>
                        <p className="order-summary-note">60,000원 이상 구매 시 무료배송</p>
                        <div className="order-summary-total">
                            <span>{createdOrder ? '결제 예정금액' : '예상 결제금액'}</span>
                            <strong>{(createdOrder?.totalPrice ?? paymentTotal).toLocaleString('ko-KR')}원</strong>
                        </div>

                        {/* 제출 버튼은 주문 요약 안에 하나만 배치합니다. */}
                        <button type="submit" className="order-submit" disabled={formLocked || cancelLoading}>
                            {orderLoading ? '주문 및 결제 연결 중...' : createdOrder?.statusNo === 0 ? '주문 취소 완료' : createdOrder ? '주문 생성 완료' : paymentMethod === 'BANK' ? '무통장입금 신청' : '결제하기'}
                        </button>

                        {/* 결제가 중단되면 생성된 주문에서 이어서 진행합니다. */}
                        {createdOrder?.statusNo === 1 && (
                            <>
                                {!orderLoading && (
                                    <Link className="order-payment-link" to={`/orders/${createdOrder.no}`}>
                                        주문 확인 / 결제 계속하기
                                    </Link>
                                )}
                                <button type="button" className="order-cancel" disabled={orderLoading || cancelLoading} onClick={handleCancelOrder}>
                                    {cancelLoading ? '주문 취소 중...' : '주문 취소'}
                                </button>
                            </>
                        )}

                        {createdOrder && (
                            <p className="order-summary-note order-summary-note--bottom" role="status">
                                주문번호: {createdOrder.no}<br />
                                {createdOrder.statusNo === 0 ? '주문이 취소되었습니다.' : orderLoading ? '선택한 결제수단으로 연결 중입니다.' : '생성된 주문에서 결제를 이어갈 수 있습니다.'}
                            </p>
                        )}

                        {createdOrder?.statusNo === 0 && <Link to="/products">상품 보러 가기</Link>}
                    </aside>
                </form>
            </div>
        </main>
    );
}