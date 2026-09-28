import { Outlet } from 'react-router-dom';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';

// 사용자 페이지의 공통 레이아웃입니다.
// Outlet에는 App.tsx에서 현재 주소와 일치하는 페이지가 표시됩니다.
export default function SiteLayout() {
    return (
        <>
            <Header />
            <Outlet />
            <Footer />
        </>
    );
}