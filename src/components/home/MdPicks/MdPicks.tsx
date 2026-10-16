import { useEffect, useState } from 'react';
import './MdPicks.css';

import ProductCard from '../../product/ProductCard';
import { getMdPicks, getMdPickTags, type MdPickTag } from '../../../api/productApi';
import type { Product } from '../../../ts/product';

// 화면용 영문 이름만 변환합니다. API에는 DB의 원래 태그를 전달합니다.
const STYLE_LABELS: Record<string, string> = {
    '미니멀': 'MINIMAL', '스트리트': 'STREET', '캐주얼': 'CASUAL',
    '빈티지': 'VINTAGE', '클래식': 'CLASSIC', '모던': 'MODERN',
    '스포티': 'SPORTY', '로맨틱': 'ROMANTIC', '페미닌': 'FEMININE',
    '시크': 'CHIC', '포멀': 'FORMAL', '워크웨어': 'WORKWEAR',
    '아메카지': 'AMEKAJI', '유틸리티': 'UTILITY', '고프코어': 'GORPCORE',
    'minimal': 'MINIMAL', 'streetwear': 'STREET', 'street': 'STREET',
};
function styleLabel(tag: string): string {
    if (!tag) return 'ALL';
    const name = tag.replace(/^style:/i, '').trim();
    // 신규 태그도 숨기지 않습니다. 사전에 없는 한글은 원래 이름을 표시합니다.
    return `#${STYLE_LABELS[name] ?? STYLE_LABELS[name.toLowerCase()] ?? name.toUpperCase()}`;
}

export default function MdPicks() {
    const [tags, setTags] = useState<MdPickTag[]>([]);
    const [selectedTag, setSelectedTag] = useState('');
    const [tagError, setTagError] = useState('');
    const [tagRetry, setTagRetry] = useState(0);
    // 저장된 태그를 그대로 표시하며 임의의 분류를 생성하지 않습니다.
    useEffect(() => {
        const controller = new AbortController();
        getMdPickTags(controller.signal).then(data => {
            if (!controller.signal.aborted) { setTags(data); setTagError(''); }
        }).catch(() => {
            if (!controller.signal.aborted) setTagError('스타일 태그를 불러오지 못했습니다.');
        });
        return () => controller.abort();
    }, [tagRetry]);

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        let active = true;
        const controller = new AbortController();

        const loadProducts = async () => {
            setLoading(true);
            setError('');

            try {
                // 판매 중인 추천 상품을 관리자 지정 순서로 최대 5개 조회합니다.
                const data = await getMdPicks(5, selectedTag, controller.signal);
                if (!active) return;

                setProducts(data.map(product => ({
                    id: product.no,
                    brand: product.brandName,
                    name: product.name,
                    price: product.salePrice,
                    image: product.mainImageUrl ?? '',
                    category: product.categoryName as Product['category'],
                    discountRate: product.discountRate > 0
                        ? product.discountRate
                        : undefined,
                    originalPrice: product.discountRate > 0
                        ? product.price
                        : undefined,
                })));
            } catch (err) {
                if (active) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : '추천 상품을 불러오지 못했습니다.',
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        void loadProducts();

        return () => {
            active = false;
            controller.abort();
        };
    }, [retryCount, selectedTag]);

    return (
        <section className="md-picks">
            <div className="md-picks-title">
                <h2>MD’s Picks</h2>
            </div>

            <div className="md-picks-tags" role="group" aria-label="MD 추천 스타일 필터">
                {[{ tag: '', productCount: 0 }, ...tags].map(item => (
                    <button key={item.tag} type="button" aria-pressed={selectedTag === item.tag}
                        onClick={() => {
                            if (selectedTag === item.tag) return;
                            // 빠르게 전환해도 이전 상품이 새 태그의 결과로 보이지 않게 처리합니다.
                            setLoading(true);
                            setSelectedTag(item.tag);
                        }}>
                        {styleLabel(item.tag)}
                    </button>
                ))}
            </div>
            {tagError && <div className="md-picks-message" role="alert">
                <p>{tagError}</p>
                <button type="button" onClick={() => setTagRetry(value => value + 1)}>태그 다시 조회</button>
            </div>}

            {loading && <p role="status">추천 상품을 불러오는 중입니다.</p>}

            {!loading && error && (
                <div role="alert">
                    <p>{error}</p>
                    <button
                        type="button"
                        onClick={() => setRetryCount(prev => prev + 1)}
                    >
                        다시 조회
                    </button>
                </div>
            )}

            {!loading && !error && products.length === 0 && (
                <p role="status">{selectedTag ? '해당 스타일의 상품을 준비 중입니다.' : '준비 중인 컬렉션입니다.'}</p>
            )}

            {!loading && !error && products.length > 0 && (
                <div className="md-picks-products">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </section>
    );
}