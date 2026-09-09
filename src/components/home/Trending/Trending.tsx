import { useEffect, useState } from 'react';
import './Trending.css';

// 원본 Obscura Trending 이미지
import knitImage from '../../../assets/images/obscura/ojos kintTop.jpg';
import bootsImage from '../../../assets/images/obscura/ojos boots.jpg';
import hatImage from '../../../assets/images/obscura/ojos hat.jpg';
import greyImage from '../../../assets/images/obscura/ojos grey.jpg';
import skyImage from '../../../assets/images/obscura/ojos sky.jpg';
import paddingImage from '../../../assets/images/obscura/ojos padding.jpg';
import mainImage from '../../../assets/images/obscura/ojos_main.jpg';

// 원본 Trending 브랜드 순위
const trendingBrands = ['OJOS', 'YOUTH', 'SAN SAN GEAR', 'MONTBELL', '4SDESIGNS', 'NHOJ(JOHN)', 'BED J.W. FORD', 'SALOMON'];

// 현재 OJOS 상품 이미지
const trendingImages = [
  { id:1, image:knitImage, alt:'OJOS knit top' },
  { id:2, image:bootsImage, alt:'OJOS boots' },
  { id:3, image:hatImage, alt:'OJOS hat' },
  { id:4, image:greyImage, alt:'OJOS grey item' },
  { id:5, image:skyImage, alt:'OJOS sky item' },
  { id:6, image:paddingImage, alt:'OJOS padding item' },
];

export default function Trending() {
  // 원본 JS의 자동 랭킹 이동 효과를 React 상태로 변경
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStartIndex((prev) => (prev + 1) % trendingBrands.length);
    }, 3500);

    return () => window.clearInterval(timer);
  }, []);

  // 현재 위치부터 순서를 다시 만들어 자연스럽게 반복
  const orderedBrands = [
    ...trendingBrands.slice(startIndex),
    ...trendingBrands.slice(0, startIndex),
  ];

  return (
    <section className="trending">
      <div className="trending-inner">

        {/* 왼쪽 브랜드 순위 */}
        <div className="trending-left">
          <div className="trending-title">
            <h2>Trending Now</h2>
            <p>옵스큐라에서 가장 주목받는 상품을 살펴보세요</p>
          </div>

          <ul className="trending-ranking">
            {orderedBrands.slice(0, 4).map((brand) => {
              const originalIndex = trendingBrands.indexOf(brand);

              return (
                <li key={brand}>
                  <a href="#">
                    <span>{originalIndex + 1}</span>
                    {brand}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 가운데 작은 상품 이미지 6개 */}
        <div className="trending-grid">
          {trendingImages.map((item) => (
            <article className="trending-item" key={item.id}>
              <a href="#">
                <img src={item.image} alt={item.alt} />
              </a>

              {/* 찜 버튼은 추후 공통 기능으로 연결 */}
              <button type="button" className="trending-like" aria-label="찜 추가">
                ♡
              </button>
            </article>
          ))}
        </div>

        {/* 오른쪽 대표 이미지 */}
        <article className="trending-main">
          <a href="#">
            <img src={mainImage} alt="OJOS 대표 이미지" />
          </a>

          <button type="button" className="trending-like" aria-label="찜 추가">
            ♡
          </button>
        </article>

      </div>
    </section>
  );
}