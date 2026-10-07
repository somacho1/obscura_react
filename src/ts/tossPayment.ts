import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import type { OrderResponse } from './order';

// 주문 상세페이지와 주문서에서 같은 결제창 호출 함수를 사용합니다.
export async function openTossPayment(order: OrderResponse, memberNo: number): Promise<void> {
    const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY?.trim();

    // 현재 프로젝트는 실제 돈이 차감되지 않는 테스트 키만 사용합니다.
    if (!clientKey || !clientKey.startsWith('test_ck')) {
        throw new Error('Toss 테스트 클라이언트 키를 확인해주세요.');
    }
    if (order.mno !== memberNo) {
        throw new Error('본인의 주문만 결제할 수 있습니다.');
    }
    if (order.statusNo !== 1) {
        throw new Error('결제 대기 주문만 결제할 수 있습니다.');
    }
    if (!Number.isSafeInteger(order.totalPrice) || order.totalPrice <= 0) {
        throw new Error('결제금액을 확인해주세요.');
    }

    const tossPayments = await loadTossPayments(clientKey);

    // 회원마다 같은 식별자를 사용합니다. 개인정보 대신 회원번호로 구성합니다.
    const payment = tossPayments.payment({ customerKey: `OBSCURA_MEMBER_${memberNo}` });
    const orderId = `OBSCURA_${order.no}`;
    const firstProductName = order.items[0]?.productName || 'OBSCURA 상품';
    const orderName = order.items.length > 1
        ? `${firstProductName} 외 ${order.items.length - 1}건`
        : firstProductName;

    // 결제창을 닫아 orderId가 반환되지 않아도 원래 주문으로 돌아갈 수 있게 합니다.
    const failUrl = new URL('/payments/fail', window.location.origin);
    failUrl.searchParams.set('orderNo', String(order.no));

    await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: order.totalPrice },
        orderId,
        orderName: orderName.slice(0, 100),
        successUrl: `${window.location.origin}/payments/success`,
        failUrl: failUrl.toString(),
    });
}