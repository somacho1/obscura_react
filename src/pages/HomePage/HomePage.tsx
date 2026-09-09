import Header from '../../components/common/Header/Header';
import Footer from '../../components/common/Footer/Footer';
import Hero from '../../components/home/Hero/Hero';
import TodayNew from '../../components/home/TodayNew/TodayNew';
import BestSellers from '../../components/home/BestSellers/BestSellers';
import TopBrands from '../../components/home/TopBrands/TopBrands';
import MdPicks from '../../components/home/MdPicks/MdPicks';
import Trending from '../../components/home/Trending/Trending';

export default function HomePage() {
  return (
    <>
      {/* 사이트 공통 헤더 */}
      <Header />

      <main>
        {/* 메인 비주얼 */}
        <Hero />

        {/* 신상품 */}
        <TodayNew />

        {/* 인기 상품 */}
        <BestSellers />

        {/* 주요 브랜드 */}
        <TopBrands />

        {/* MD 추천 상품 */}
        <MdPicks />

        {/* 인기 브랜드 / 상품 */}
        <Trending />
      </main>

      {/* 사이트 공통 Footer */}
      <Footer />
    </>
  );
}