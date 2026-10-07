import { useEffect, useState } from 'react';
import { getDeliveriesByOrder } from '../../api/deliveryApi';
import type { DeliveryResponse } from '../../ts/delivery';
import './OrderDeliveryInfo.css';

interface Props {
    orderNo: number;
}

const DELIVERY_STATUS: Record<number, string> = {
    0: '배송 준비',
    1: '배송 중',
    2: '배송 완료',
};

// 날짜가 없거나 올바르지 않으면 대시로 표시합니다.
function formatDate(value: string | null | undefined): string {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

// CJ대한통운 송장번호를 공식 조회 페이지로 전달합니다.
function getTrackingUrl(company: string | null | undefined, trackingNo: string | null | undefined) {
    const carrier = (company ?? '').replace(/\s/g, '').toUpperCase();
    const number = (trackingNo ?? '').replace(/[\s-]/g, '');

    const isCj = ['CJ대한통운', '대한통운', 'CJ', 'CJ택배'].includes(carrier);
    if (!isCj || !/^\d+$/.test(number)) return null;

    return `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${encodeURIComponent(number)}`;
}

export default function OrderDeliveryInfo({ orderNo }: Props) {
    const [deliveries, setDeliveries] = useState<DeliveryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let active = true;
        setDeliveries([]);
        setLoading(true);
        setError('');

        async function load() {
            try {
                const data = await getDeliveriesByOrder(orderNo);

                if (data.some((delivery) => delivery.ordno !== orderNo)) {
                    throw new Error('주문의 배송정보가 일치하지 않습니다.');
                }

                if (active) setDeliveries(data);
            } catch (err) {
                if (active) {
                    setError(err instanceof Error ? err.message : '배송정보를 불러오지 못했습니다.');
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        void load();
        return () => { active = false; };
    }, [orderNo, retry]);

    return (
        <section className="order-delivery">
            <div className="order-delivery__heading">
                <h2>배송정보</h2>
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => setRetry((prev) => prev + 1)}
                >
                    새로고침
                </button>
            </div>

            {loading ? (
                <p className="order-delivery__notice" role="status">
                    배송정보를 불러오는 중입니다.
                </p>
            ) : error ? (
                <p className="order-delivery__notice" role="alert">{error}</p>
            ) : deliveries.length === 0 ? (
                <p className="order-delivery__notice">아직 등록된 배송정보가 없습니다.</p>
            ) : (
                <div className="order-delivery__list">
                    {/* 부분배송을 고려해 첫 번째 배송만 표시하지 않습니다. */}
                    {deliveries.map((delivery, index) => (
                        <article className="order-delivery__card" key={delivery.no}>
                            <div className="order-delivery__card-heading">
                                <h3>{deliveries.length > 1 ? `배송 ${index + 1}` : '배송 내역'}</h3>
                                <span className={`order-delivery__status order-delivery__status--${delivery.statusNo}`}>
                                    {DELIVERY_STATUS[delivery.statusNo] ?? '상태 확인 필요'}
                                </span>
                            </div>

                            <dl className="order-delivery__details">
                                <div>
                                    <dt>받는 사람</dt>
                                    <dd>{delivery.receiver || '-'}</dd>
                                </div>
                                <div>
                                    <dt>연락처</dt>
                                    <dd>{delivery.phone || '-'}</dd>
                                </div>
                                <div>
                                    <dt>배송지</dt>
                                    <dd>
                                        {delivery.zipcode && `(${delivery.zipcode}) `}
                                        {delivery.address1 || '-'}
                                        {delivery.address2 && <><br />{delivery.address2}</>}
                                    </dd>
                                </div>
                                <div>
                                    <dt>택배사</dt>
                                    <dd>{delivery.company || '출고 후 안내'}</dd>
                                </div>
                                <div>
                                    <dt>송장번호</dt>
                                    <dd className="order-delivery__tracking">
                                        <span>{delivery.trackingNo || '출고 후 안내'}</span>

                                        {/* 배송 중·완료 상태이며 CJ 송장번호가 있을 때 표시합니다. */}
                                        {(delivery.statusNo === 1 || delivery.statusNo === 2)
                                            && getTrackingUrl(delivery.company, delivery.trackingNo) && (
                                                <a
                                                    className="order-delivery__tracking-link"
                                                    href={getTrackingUrl(delivery.company, delivery.trackingNo)!}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label={`송장번호 ${delivery.trackingNo} 배송조회, 새 탭으로 열기`}
                                                >
                                                    배송조회 ↗
                                                </a>
                                            )}
                                    </dd>
                                </div>
                                <div>
                                    <dt>출고일시</dt>
                                    <dd>{formatDate(delivery.shipDate)}</dd>
                                </div>
                                <div>
                                    <dt>배송완료일시</dt>
                                    <dd>{formatDate(delivery.deliveryDate)}</dd>
                                </div>
                            </dl>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}