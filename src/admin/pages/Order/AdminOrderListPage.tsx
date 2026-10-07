import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAdminOrderPage } from '../../../api/orderApi';
import type { AdminOrderPageResponse } from '../../../ts/order';
import './AdminOrderListPage.css';

// 기존 ORDERS.STATUSNO와 동일한 상태값을 사용합니다.
const ORDER_STATUS: Record<number, string> = {
    0: '주문 취소',
    1: '결제 대기',
    2: '결제 완료',
    3: '상품 준비',
    4: '배송 중',
    5: '배송 완료',
};

// 날짜 문자열이 잘못된 경우에도 화면이 깨지지 않도록 처리합니다.
function formatOrderDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
}

export default function AdminOrderListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const pageParam = searchParams.get('page');
    const parsedPage = Number(pageParam ?? '1');

    // 잘못된 페이지 번호는 첫 페이지로 처리합니다.
    const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const [result, setResult] = useState<AdminOrderPageResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    // 페이지 변경 시 서버에서 해당 페이지의 주문만 가져옵니다.
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        setResult(null);

        async function loadOrders() {
            try {
                const data = await getAdminOrderPage(page, 20);
                if (cancelled) return;

                // 주문 삭제 등으로 페이지 수가 줄었다면 마지막 유효 페이지로 이동합니다.
                const lastPage = Math.max(1, data.totalPages);
                if (page > lastPage) {
                    setSearchParams(current => {
                        const next = new URLSearchParams(current);
                        next.set('page', String(lastPage));
                        return next;
                    }, { replace: true });
                    return;
                }

                setResult(data);
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : '주문 목록을 불러오지 못했습니다.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadOrders();
        return () => { cancelled = true; };
    }, [page, retryCount, setSearchParams]);

    // URL에 페이지를 저장해 새로고침 후에도 같은 페이지를 표시합니다.
    const handlePageChange = (nextPage: number) => {
        if (loading || !result || nextPage < 1 || nextPage > result.totalPages || nextPage === page) return;
        setSearchParams(current => {
            const next = new URLSearchParams(current);
            next.set('page', String(nextPage));
            return next;
        });
    };

    // 페이지 버튼은 최대 5개씩 표시합니다.
    const totalPages = result?.totalPages ?? 0;
    const startPage = Math.floor((page - 1) / 5) * 5 + 1;
    const pageNumbers = Array.from(
        { length: Math.max(0, Math.min(5, totalPages - startPage + 1)) },
        (_, index) => startPage + index,
    );

    return (
        <main className="admin-order-list">
            <header className="admin-order-list__heading">
                <div>
                    <p>ORDER MANAGEMENT</p>
                    <h1>주문 관리</h1>
                </div>
                <button type="button" disabled={loading} onClick={() => setRetryCount(count => count + 1)}>
                    {loading ? '조회 중...' : '새로고침'}
                </button>
            </header>

            {/* 현재 페이지 건수가 아닌 전체 주문 건수를 표시합니다. */}
            <div className="admin-order-list__summary">
                <span>전체 주문</span>
                <strong>{result ? result.totalElements.toLocaleString('ko-KR') : '-'}건</strong>
            </div>

            {loading ? (
                <div className="admin-order-list__state" role="status">주문 목록을 불러오는 중입니다.</div>
            ) : error ? (
                <div className="admin-order-list__state" role="alert">
                    <p>{error}</p>
                    <button type="button" onClick={() => setRetryCount(count => count + 1)}>다시 조회</button>
                </div>
            ) : !result || result.empty ? (
                <div className="admin-order-list__state">등록된 주문이 없습니다.</div>
            ) : (
                <>
                    {/* 좁은 화면에서는 표를 가로로 스크롤할 수 있게 합니다. */}
                    <div className="admin-order-list__table-wrap">
                        <table className="admin-order-list__table">
                            <thead>
                                <tr>
                                    <th scope="col">주문번호</th>
                                    <th scope="col">주문일시</th>
                                    <th scope="col">회원번호</th>
                                    <th scope="col">주문 상품</th>
                                    <th scope="col">총 수량</th>
                                    <th scope="col">주문 금액</th>
                                    <th scope="col">주문 상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.content.map(order => {
                                    const firstItem = order.items[0];
                                    const totalQty = order.items.reduce((sum, item) => sum + item.qty, 0);

                                    return (
                                        <tr key={order.no}>
                                            <td><strong>{order.no}</strong></td>
                                            <td>{formatOrderDate(order.cdate)}</td>
                                            <td>{order.mno}</td>
                                            <td className="admin-order-list__product">
                                                <span>{firstItem?.productName ?? '상품 정보 없음'}</span>
                                                {order.items.length > 1 && <small>외 {order.items.length - 1}개 옵션</small>}
                                            </td>
                                            {/* 취소 주문도 구매 당시 수량과 금액을 유지해서 표시합니다. */}
                                            <td>{totalQty}개</td>
                                            <td className="admin-order-list__amount">{order.totalPrice.toLocaleString('ko-KR')}원</td>
                                            <td>
                                                <span className={`admin-order-list__status admin-order-list__status--${order.statusNo}`}>
                                                    {ORDER_STATUS[order.statusNo] ?? '확인 필요'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* 결제수단과 무통장입금 상태는 관리자 상세 화면에서 조회합니다. */}
                    {totalPages > 1 && (
                        <nav className="admin-order-list__pagination" aria-label="주문 목록 페이지">
                            <button type="button" disabled={page === 1} onClick={() => handlePageChange(page - 1)} aria-label="이전 페이지">이전</button>
                            {pageNumbers.map(number => (
                                <button type="button" key={number} className={number === page ? 'active' : ''} aria-current={number === page ? 'page' : undefined} onClick={() => handlePageChange(number)}>
                                    {number}
                                </button>
                            ))}
                            <button type="button" disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)} aria-label="다음 페이지">다음</button>
                        </nav>
                    )}
                </>
            )}
        </main>
    );
}