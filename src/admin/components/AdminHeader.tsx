import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminHeader.css';

function AdminHeader() {
    const navigate = useNavigate();
    const { member, logoutMember } = useAuth();

    const handleLogout = async () => {
        try {
            await logoutMember();
            navigate('/login');
        } catch (err) {
            window.alert(err instanceof Error ? err.message : '로그아웃에 실패했습니다.');
        }
    };

    return (
        <header className="admin-header">
            <div className="admin-header-top">
                <NavLink to="/admin" className="admin-logo">
                    <strong>OBSCURA</strong>
                    <span>/ ADMIN</span>
                </NavLink>

                <div className="admin-header-actions">
                    <NavLink to="/" target="_blank">VIEW SHOP</NavLink>
                    <button type="button" onClick={handleLogout}>LOGOUT</button>
                </div>
            </div>

            <nav className="admin-nav">
                <NavLink to="/admin" end className={({ isActive }) => isActive ? 'active' : ''}>DASHBOARD</NavLink>
                <NavLink  to="/admin/banners"  className={({ isActive }) => isActive ? 'active' : ''}  >  BANNERS </NavLink>
                <NavLink to="/admin/brands" className={({ isActive }) => isActive ? 'active' : ''}>BRANDS</NavLink>
                <NavLink to="/admin/products" className={({ isActive }) => isActive ? 'active' : ''}>PRODUCTS</NavLink>
                <NavLink to="/admin/orders" className={({ isActive }) => isActive ? 'active' : ''}>ORDERS</NavLink>
                {member?.role === 'SUPER_ADMIN' && (<NavLink to="/admin/members" className={({ isActive }) => isActive ? 'active' : ''}>MEMBERS</NavLink>)}
            </nav>
        </header>
    );
}

export default AdminHeader;
