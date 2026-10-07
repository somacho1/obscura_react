import { BrowserRouter, Route, Routes } from 'react-router-dom';

import SiteLayout from './layouts/SiteLayout';
import AdminLayout from './admin/AdminLayout';
import AdminDashboardPage from './admin/pages/Dashboard/AdminDashboardPage';
import AdminBrandListPage from './admin/pages/Brand/AdminBrandListPage';
import AdminBrandDetailPage from './admin/pages/Brand/AdminBrandDetailPage';
import AdminProductCreatePage from './admin/pages/Product/AdminProductCreatePage';
import AdminProductEditPage from './admin/pages/Product/AdminProductEditPage';
import AdminOrderListPage from './admin/pages/Order/AdminOrderListPage';
import AdminOrderDetailPage from './admin/pages/Order/AdminOrderDetailPage';

import Home from './pages/HomePage/HomePage';
import ProductListPage from './pages/ProductListPage/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage/ProductDetailPage';
import CartPage from './pages/CartPage/CartPage';
import LoginPage from './pages/LoginPage/LoginPage';
import JoinPage from './pages/JoinPage/JoinPage';
import OrderPage from './pages/OrderPage/OrderPage';
import OrderDetailPage from './pages/OrderDetailPage/OrderDetailPage';
import PaymentSuccessPage from './pages/PaymentPage/PaymentSuccessPage';
import PaymentFailPage from './pages/PaymentPage/PaymentFailPage';
import MyPage from './pages/MyPage/MyPage';
import MyOrderListPage from './pages/MyPage/MyOrderListPage';
import MyWishlistPage from './pages/MyPage/MyWishlistPage';
import MyProfilePage from './pages/MyPage/MyProfilePage';
import MyAddressPage from './pages/MyPage/MyAddressPage';



function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 사용자 페이지: SiteLayout이 공통 Header와 Footer를 표시합니다. */}
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:productNo" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/orders/:orderNo" element={<OrderDetailPage />} />
          <Route path="/payments/success" element={<PaymentSuccessPage />} />
          <Route path="/payments/fail" element={<PaymentFailPage />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/mypage/orders" element={<MyOrderListPage />} />
          <Route path="/mypage/wishlist" element={<MyWishlistPage />} />
          <Route path="/mypage/profile" element={<MyProfilePage />} />
          <Route path="/mypage/addresses" element={<MyAddressPage />} />
        </Route>

        {/* 관리자 페이지: 기존 AdminLayout을 별도로 사용합니다. */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="brands" element={<AdminBrandListPage />} />
          <Route path="brands/:no" element={<AdminBrandDetailPage />} />
          <Route path="products/create" element={<AdminProductCreatePage />} />
          <Route path="products/:productNo/edit" element={<AdminProductEditPage />} />
          <Route path="orders" element={<AdminOrderListPage />} />
          <Route path="orders/:orderNo" element={<AdminOrderDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;