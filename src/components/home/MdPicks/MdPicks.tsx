import './MdPicks.css';
import ProductCard from '../../product/ProductCard';
import type { Product } from '../../../ts/product';

// 원본 Obscura MD's Picks 상품 이미지
import eytysImage from '../../../assets/images/obscura/s eytys.jpg';
import birkenstockImage from '../../../assets/images/obscura/s bksk.jpg';
import salomonImage from '../../../assets/images/obscura/s salomon.jpg';
import klgImage from '../../../assets/images/obscura/s klg.jpg';
import hikingImage from '../../../assets/images/obscura/s hiking.jpg';

// MD's Picks 상단 태그
const mdTags = ['SHOES', 'Hoodies', 'Outerwear', 'Hats', 'Bags'];

// 원본 HTML에 있던 MD's Picks 상품 데이터
const mdPickProducts: Product[] = [
    { id: 201, brand: 'EYTYS', name: 'Fugu - Suede Black', price: 197600, originalPrice: 494000, discountRate: 60, image: eytysImage, category: 'SHOES' },
    { id: 202, brand: 'BIRKENSTOCK', name: 'Kyoto VL/NU - Antique White', price: 91600, originalPrice: 229000, discountRate: 60, image: birkenstockImage, category: 'SHOES' },
    { id: 203, brand: 'SALOMON', name: 'ODYSSEY ELMT ADVENCED CREAR - Vanilla ice', price: 210000, originalPrice: 350000, discountRate: 40, image: salomonImage, category: 'SHOES' },
    { id: 204, brand: 'KIDS LOVE GAITE', name: 'Dave - Black Wax Leather', price: 684000, originalPrice: 1140000, discountRate: 40, image: klgImage, category: 'SHOES' },
    { id: 205, brand: 'HIKING PATROL', name: 'HP X Diemme Movide - Deep Plum Patent', price: 300000, originalPrice: 600000, discountRate: 50, image: hikingImage, category: 'SHOES' },
];

export default function MdPicks() {
    return (
        <section className="md-picks">
            {/* 섹션 제목 */}
            <div className="md-picks-title">
                <h2>MD’s Picks</h2>
            </div>

            {/* 상품 카테고리 태그 - 실제 필터 기능은 이후 연결 */}
            <ul className="md-picks-tags">
                {mdTags.map((tag) => (
                    <li key={tag}>
                        <button type="button">#{tag}</button>
                    </li>
                ))}
            </ul>

            {/* 기존 ProductCard 공통 컴포넌트 재사용 */}
            <div className="md-picks-products">
                {mdPickProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </section>
    );
}