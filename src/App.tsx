import { BrowserRouter, Route, Routes } from 'react-router-dom';

import AdminLayout from './admin/AdminLayout';
import AdminDashboardPage from './admin/pages/Dashboard/AdminDashboardPage';
import AdminBrandListPage from './admin/pages/Brand/AdminBrandListPage';

import Home from './pages/HomePage/HomePage';
import ProductDetailPage from './pages/ProductDetailPage/ProductDetailPage';
import CartPage from './pages/CartPage/CartPage';
import LoginPage from './pages/LoginPage/LoginPage';
import JoinPage from './pages/JoinPage/JoinPage';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 메인 페이지 */}
        <Route path="/" element={<Home />} />

        {/* 관리자 */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="brands" element={<AdminBrandListPage />} />
        </Route>

        {/* 상품 상세 페이지 */}
        <Route path="/products/:productNo" element={<ProductDetailPage />} />

        {/* 장바구니 페이지 */}
        <Route path="/cart" element={<CartPage />} />

        {/* 로그인 페이지 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 회원가입 페이지 */}
        <Route path="/join" element={<JoinPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;