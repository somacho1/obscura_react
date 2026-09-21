import { useNavigate } from 'react-router-dom';
import './AdminDashboardPage.css';

function AdminDashboardPage() {
    const navigate = useNavigate();

    return (
        <section className="admin-dashboard">
            <div className="dashboard-heading">
                <div>
                    <span>ADMIN</span>
                    <h1>DASHBOARD</h1>
                    <p>스토어 운영 현황</p>
                </div>
            </div>

            <div className="dashboard-section-title">
                <h2>OVERVIEW</h2>
                <span>STORE STATUS</span>
            </div>

            <div className="dashboard-overview">
                <div className="dashboard-stat">
                    <span>BRANDS</span>
                    <strong>04</strong>
                    <p>등록 브랜드</p>
                </div>

                <div className="dashboard-stat">
                    <span>PRODUCTS</span>
                    <strong>41</strong>
                    <p>등록 상품</p>
                </div>

                <div className="dashboard-stat dashboard-stat-sale">
                    <span>ON SALE</span>
                    <strong>10</strong>
                    <p>할인 상품</p>
                </div>

                <div className="dashboard-stat">
                    <span>ORDERS</span>
                    <strong>06</strong>
                    <p>신규 주문</p>
                </div>
            </div>

            <div className="dashboard-section-title dashboard-menu-title">
                <h2>MANAGEMENT</h2>
            </div>

            <div className="dashboard-management">
                <button type="button" className="management-card" onClick={() => navigate('/admin/brands')}>
                    <div>
                        <span>BRANDS</span>
                        <h3>브랜드 관리</h3>
                        <p>브랜드 · 상품 · 할인</p>
                    </div>
                    <strong>→</strong>
                </button>

                <button type="button" className="management-card" onClick={() => navigate('/admin/products')}>
                    <div>
                        <span>PRODUCTS</span>
                        <h3>상품 관리</h3>
                        <p>상품 · 옵션 · 재고</p>
                    </div>
                    <strong>→</strong>
                </button>
            </div>

            <div className="dashboard-content">
                <div className="dashboard-panel">
                    <div className="dashboard-panel-heading">
                        <div>
                            <h2>RECENT ORDERS</h2>
                            <span>최근 주문</span>
                        </div>
                        <button type="button" onClick={() => navigate('/admin/orders')}>VIEW ALL →</button>
                    </div>

                    <div className="dashboard-empty">
                        <p>등록된 주문이 없습니다.</p>
                    </div>
                </div>

                <div className="dashboard-panel">
                    <div className="dashboard-panel-heading">
                        <div>
                            <h2>RECENT PRODUCTS</h2>
                            <span>최근 등록 상품</span>
                        </div>
                        <button type="button" onClick={() => navigate('/admin/products')}>VIEW ALL →</button>
                    </div>

                    <div className="dashboard-empty">
                        <p>등록된 상품이 없습니다.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default AdminDashboardPage;