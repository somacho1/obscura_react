import Hero from '../../components/home/Hero/Hero';
import TodayNew from '../../components/home/TodayNew/TodayNew';
import BestSellers from '../../components/home/BestSellers/BestSellers';
import TopBrands from '../../components/home/TopBrands/TopBrands';
import MdPicks from '../../components/home/MdPicks/MdPicks';
import Trending from '../../components/home/Trending/Trending';

export default function HomePage() {
  return (
    <main>
      {/* Header와 Footer는 App.tsx의 SiteLayout에서 표시합니다. */}
      <Hero />
      <TodayNew />
      <BestSellers />
      <TopBrands />
      <MdPicks />
      <Trending />
    </main>
  );
}