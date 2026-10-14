import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboard } from '../../../api/adminDashboardApi';
import type { AdminDashboardResponse } from '../../../api/adminDashboardApi';
import './AdminDashboardPage.css';

// DB의 주문 상태값과 동일합니다.
const ORDER_STATUS: Record<number, string> = {
    0: '주문 취소',
    1: '결제 대기',
    2: '결제 완료',
    3: '상품 준비',
    4: '배송 중',
    5: '배송 완료',
};

function formatNumber(value: number): string {
    return value.toLocaleString('ko-KR');
}

// 서버가 보내는 주문·상품 등록일과 마지막 조회 시간을 표시합니다.
function formatDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';

    return parsed.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

function getOrderStatus(statusNo: number, cancelStatusNo: number): string {
    if (cancelStatusNo === 2) return '전체 취소';
    if (cancelStatusNo === 3) return '취소 처리 중';

    const status = ORDER_STATUS[statusNo] || '상태 확인';
    return cancelStatusNo === 1 ? `부분취소 · ${status}` : status;
}

export default function AdminDashboardPage() {
    const [data, setData] = useState<AdminDashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);

    // 최초 진입과 새로고침 버튼 클릭 시 실제 운영 현황을 조회합니다.
    // 화면 이동 시 요청을 취소하고, 조회 실패 시 기존 결과는 유지합니다.
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError('');

        getAdminDashboard(controller.signal)
            .then(result => {
                if (!controller.signal.aborted) setData(result);
            })
            .catch((err: unknown) => {
                if (!controller.signal.aborted) {
                    setError(err instanceof Error ? err.message : '운영 현황을 불러오지 못했습니다.');
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [revision]);

    // 서버는 최근 5건을 반환하지만 대시보드에서는 3건만 표시합니다.
    const recentOrders = data?.recentOrders.slice(0, 3) ?? [];
    const recentProducts = data?.recentProducts.slice(0, 3) ?? [];

    const stats = [
        { title: '등록 브랜드', value: data?.brandCount, to: '/admin/brands', accent: false },
        { title: '등록 상품', value: data?.productCount, to: '/admin/brands', accent: false },
        { title: '할인 상품', value: data?.saleProductCount, to: '/admin/brands', accent: true },
        { title: '오늘 주문', value: data?.todayOrderCount, to: '/admin/orders', accent: false },
    ];

    return (
        <section className="admin-dashboard" aria-busy={loading}>
            {/* 큰 소개 영역을 없애고 제목과 새로고침만 배치합니다. */}
            <header className="dashboard-heading">
                <h1>DASHBOARD</h1>
                <div className="dashboard-refresh">
                    {data && <span>{formatDate(data.updatedAt)} 기준</span>}
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => setRevision(value => value + 1)}
                    >
                        {loading ? '조회 중…' : '새로고침'}
                    </button>
                </div>
            </header>

            {error && (
                <p role="alert" className="dashboard-error">
                    {error}
                    {data && ' 이전 조회 결과를 표시하고 있습니다.'}
                </p>
            )}

            {/* 통계에는 제목과 숫자만 표시합니다. */}
            <div className="dashboard-overview">
                {stats.map(stat => (
                    <Link
                        key={stat.title}
                        to={stat.to}
                        className={`dashboard-stat${stat.accent ? ' dashboard-stat-sale' : ''}`}
                    >
                        <span>{stat.title}</span>
                        <strong>{stat.value === undefined ? '—' : formatNumber(stat.value)}</strong>
                    </Link>
                ))}
            </div>

            {/* 반복 설명은 통계 아래 한 곳으로 모았습니다. */}
            <p className="dashboard-note">
                등록 수는 비활성 포함 · 할인은 판매 중 상품 기준 · 오늘 주문은 결제대기·취소 포함
            </p>

            {/* 관리 바로가기 카드 대신 최근 목록을 바로 보여줍니다. */}
            <div className="dashboard-content">
                <section className="dashboard-panel">
                    <header className="dashboard-panel-heading">
                        <h2>최근 주문</h2>
                        <Link to="/admin/orders">전체 보기 →</Link>
                    </header>

                    {!data ? (
                        <p className="dashboard-empty">
                            {loading ? '주문을 불러오는 중입니다.' : '주문을 조회하지 못했습니다.'}
                        </p>
                    ) : recentOrders.length === 0 ? (
                        <p className="dashboard-empty">등록된 주문이 없습니다.</p>
                    ) : (
                        <ul className="dashboard-list">
                            {recentOrders.map(order => {
                                const productName = order.items[0]?.productName || '상품 정보 없음';
                                const otherItems = order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : '';
                                const cancelled = order.statusNo === 0 || order.cancelStatusNo === 2;

                                return (
                                    <li key={order.no}>
                                        <Link to={`/admin/orders/${order.no}`} className="dashboard-row">
                                            <div className="dashboard-row-main">
                                                <div className="dashboard-order-meta">
                                                    <strong>주문 #{order.no}</strong>
                                                    <time>{formatDate(order.cdate)}</time>
                                                </div>
                                                <span
                                                    className="dashboard-product-name"
                                                    title={`${productName}${otherItems}`}
                                                >
                                                    {productName}{otherItems}
                                                </span>
                                            </div>
                                            <div className="dashboard-row-end">
                                                <strong>{formatNumber(order.totalPrice)}원</strong>
                                                <span className={`dashboard-status${cancelled ? ' is-muted' : ''}`}>
                                                    {getOrderStatus(order.statusNo, order.cancelStatusNo)}
                                                </span>
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                <section className="dashboard-panel">
                    <header className="dashboard-panel-heading">
                        <h2>최근 등록 상품</h2>
                        <Link to="/admin/brands">상품 관리 →</Link>
                    </header>

                    {!data ? (
                        <p className="dashboard-empty">
                            {loading ? '상품을 불러오는 중입니다.' : '상품을 조회하지 못했습니다.'}
                        </p>
                    ) : recentProducts.length === 0 ? (
                        <p className="dashboard-empty">등록된 상품이 없습니다.</p>
                    ) : (
                        <ul className="dashboard-list">
                            {recentProducts.map(product => (
                                <li key={product.no}>
                                    <Link
                                        to={`/admin/products/${product.no}/edit`}
                                        className="dashboard-row"
                                    >
                                        <div className="dashboard-row-main">
                                            <span className="dashboard-brand">{product.brandName}</span>
                                            <strong className="dashboard-product-name" title={product.name}>
                                                {product.name}
                                            </strong>
                                        </div>
                                        <div className="dashboard-row-end">
                                            <strong>{formatNumber(product.salePrice ?? product.price)}원</strong>
                                            <span className={`dashboard-status${product.statusNo !== 1 ? ' is-muted' : ''}`}>
                                                {product.statusNo === 1 ? '판매 중' : '판매 중지'}
                                            </span>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </section>
    );
}