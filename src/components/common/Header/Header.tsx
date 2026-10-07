import { useEffect, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCartItems } from '../../../api/cartApi';
import { getProductPage } from '../../../api/productApi';
import { useAuth } from '../../../context/AuthContext';
import type { ProductResponse } from '../../../ts/product';
import { getImageUrl } from '../../../ts/imageUrl';
import logo from '../../../assets/images/obscura/logo.svg';
import searchIcon from '../../../assets/images/obscura/ico_sch_black.svg';
import likeIcon from '../../../assets/images/obscura/ico_qk_like_black.svg';
import myPageIcon from '../../../assets/images/obscura/ico_my_black.svg';
import bagIcon from '../../../assets/images/obscura/ico_bag_black.svg';
import './Header.css';

// 데스크톱·모바일에서 같은 메뉴 데이터를 사용합니다.
const PRODUCT_MENUS = [
  { label: 'SHOP', to: '/products', className: 'shop-link' },
  { label: 'MEN', to: '/products?category=MEN', className: '' },
  { label: 'WOMEN', to: '/products?category=WOMEN', className: '' },
  { label: 'SHOES', to: '/products?category=SHOES', className: '' },
  { label: 'ACC', to: '/products?category=ACC', className: '' },
  { label: 'SALE', to: '/products?category=SALE', className: 'sale-link' },
];

// 전역 smooth 설정이 있어도 페이지 이동 시 즉시 맨 위로 이동합니다.
function scrollToTop() {
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  root.style.scrollBehavior = previousBehavior;
}

export default function Header() {
  const navigate = useNavigate();
  const { member, logoutMember } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [suggestions, setSuggestions] = useState<ProductResponse[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  // 페이지 이동 시 메뉴와 검색창을 닫습니다.
  const closePanels = () => { setMenuOpen(false); setSearchOpen(false); };
  const handlePageLink = () => { closePanels(); scrollToTop(); };

  // 로그인 변경과 장바구니 변경 알림을 받으면 상품 종류 수를 다시 조회합니다.
  useEffect(() => {
    let active = true;
    let requestNo = 0;

    const refreshCartCount = async () => {
      const currentRequest = ++requestNo;
      if (!member) { setCartCount(0); return; }

      try {
        const items = await getCartItems(member.no);
        if (active && currentRequest === requestNo) setCartCount(items.length);
      } catch (error) {
        console.error('장바구니 개수 조회 실패:', error);
      }
    };

    setCartCount(0);
    void refreshCartCount();
    window.addEventListener('cart-updated', refreshCartCount);

    return () => {
      active = false;
      window.removeEventListener('cart-updated', refreshCartCount);
    };
  }, [member]);

  // 두 글자 이상 입력한 후 300ms 동안 입력이 없으면 최대 5개 상품을 조회합니다.
  useEffect(() => {
    let cancelled = false;
    const value = keyword.trim();
    setSuggestions([]);
    setSuggestionError('');

    if (!searchOpen || value.length < 2) {
      setSuggestionLoading(false);
      return;
    }

    setSuggestionLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await getProductPage({ keyword: value, page: 1, size: 5 });
        if (!cancelled) setSuggestions(result.content);
      } catch {
        if (!cancelled) setSuggestionError('검색 제안을 불러오지 못했습니다. 검색 버튼으로 조회해주세요.');
      } finally {
        if (!cancelled) setSuggestionLoading(false);
      }
    }, 300);

    // 검색어가 바뀌거나 창을 닫으면 이전 응답이 현재 결과를 덮어쓰지 않도록 막습니다.
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [keyword, searchOpen]);

  // 검색 영역 밖 클릭과 ESC 키로 패널을 닫습니다.
  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (searchOpen && searchRef.current && !searchRef.current.contains(event.target as Node)) setSearchOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSearchOpen(false); setMenuOpen(false); }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [searchOpen]);

  // 데스크톱 크기로 변경되면 모바일 메뉴를 닫습니다.
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth > 1024) setMenuOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Enter 또는 검색 버튼을 누르면 전체 검색 결과로 이동합니다.
  const handleSearch = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = keyword.trim();
    if (!value) return;
    const query = new URLSearchParams({ keyword: value });
    navigate(`/products?${query.toString()}`);
    closePanels();
    scrollToTop();
  };

  // 로그아웃 후 홈으로 이동합니다.
  const handleLogout = () => {
    logoutMember();
    closePanels();
    navigate('/');
    scrollToTop();
  };

  // 헤더의 찜·마이페이지 아이콘에서 공통으로 사용합니다.
  const openMemberPage = (page: '찜 목록' | '마이페이지') => {
    closePanels();

    // 비로그인 상태에서는 로그인 페이지로 이동합니다.
    if (!member) {
      navigate('/login');
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    navigate(page === '찜 목록' ? '/mypage/wishlist' : '/mypage');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="header-left-area">
          {/* 모바일 메뉴와 검색창은 동시에 열리지 않도록 처리합니다. */}
          <button type="button" className={`header-menu-button ${menuOpen ? 'is-open' : ''}`} aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => { setMenuOpen(value => !value); setSearchOpen(false); }}>
            <span /><span /><span />
          </button>

          {/* 데스크톱 상품 메뉴 */}
          <nav className="header-desktop-nav" aria-label="주요 메뉴">
            {PRODUCT_MENUS.map(menu => (
              <Link key={menu.label} to={menu.to} className={menu.className} onClick={handlePageLink}>{menu.label}</Link>
            ))}
          </nav>
        </div>

        {/* 중앙 로고 */}
        <Link to="/" className="header-logo" aria-label="OBSCURA 홈" onClick={handlePageLink}>
          <img src={logo} alt="OBSCURA" />
        </Link>

        <div className="header-right-area" ref={searchRef}>
          {/* 검색·찜·마이페이지 아이콘 */}
          <button type="button" className="header-icon-button" aria-label="검색" aria-expanded={searchOpen} aria-controls="header-search-panel" onClick={() => { setSearchOpen(value => !value); setMenuOpen(false); }}><img src={searchIcon} alt="" /></button>
          <button type="button" className="header-icon-button header-secondary" aria-label="찜 목록" onClick={() => openMemberPage('찜 목록')}><img src={likeIcon} alt="" /></button>
          <button type="button" className="header-icon-button header-secondary" aria-label="마이페이지" onClick={() => openMemberPage('마이페이지')}><img src={myPageIcon} alt="" /></button>

          {/* 로그인 상태에 따라 LOGIN·LOGOUT 표시 */}
          {member ? (
            <button type="button" className="header-account" onClick={handleLogout}>LOGOUT</button>
          ) : (
            <Link to="/login" className="header-account" onClick={handlePageLink}>LOGIN</Link>
          )}

          {/* 장바구니와 상품 종류 수 */}
          <Link to="/cart" className="header-icon-link header-cart" aria-label={`장바구니 ${cartCount}개`} onClick={handlePageLink}>
            <img src={bagIcon} alt="" />
            {cartCount > 0 && <span className="header-cart-count">{cartCount}</span>}
          </Link>

          {/* 검색 입력과 실제 상품 검색 제안 */}
          {searchOpen && (
            <div id="header-search-panel" className="search-panel">
              <form className="search-form" onSubmit={handleSearch}>
                <label htmlFor="header-search" className="sr-only">상품 검색</label>
                <input id="header-search" type="search" value={keyword} placeholder="브랜드 · 상품명 · CODE" autoComplete="off" autoFocus maxLength={100} onChange={event => setKeyword(event.target.value)} />
                <button type="submit">검색</button>
              </form>

              {/* 입력 길이·로딩·오류·검색 결과를 구분합니다. */}
              <div className="search-suggestions" aria-label="추천 검색 상품" aria-busy={suggestionLoading}>
                {keyword.trim().length < 2 ? (
                  <p className="search-suggestion-message">검색어를 2글자 이상 입력해주세요.</p>
                ) : suggestionLoading ? (
                  <p className="search-suggestion-message" role="status">검색 중입니다.</p>
                ) : suggestionError ? (
                  <p className="search-suggestion-message" role="status">{suggestionError}</p>
                ) : suggestions.length === 0 ? (
                  <p className="search-suggestion-message" role="status">검색 결과가 없습니다.</p>
                ) : (
                  <ul className="search-suggestion-list">
                    {suggestions.map(product => (
                      <li key={product.no}>
                        {/* 상품 클릭 시 상세페이지로 이동합니다. */}
                        <Link to={`/products/${product.no}`} className="search-suggestion-item" onClick={handlePageLink}>
                          <div className="search-suggestion-image">
                            {product.mainImageUrl ? <img src={getImageUrl(product.mainImageUrl)} alt="" /> : <span>NO IMAGE</span>}
                          </div>
                          <div className="search-suggestion-info">
                            <span className="search-suggestion-brand">{product.brandName}</span>
                            <span className="search-suggestion-name">{product.name}</span>
                            <strong className="search-suggestion-price">₩{product.salePrice.toLocaleString('ko-KR')}</strong>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 모바일 상품 메뉴 */}
      <nav id="mobile-menu" className={`mobile-menu ${menuOpen ? 'is-open' : ''}`} aria-label="모바일 메뉴" aria-hidden={!menuOpen}>
        <ul>
          {PRODUCT_MENUS.map(menu => (
            <li key={menu.label}>
              <Link to={menu.to} className={menu.className} onClick={handlePageLink}>{menu.label} <span>↗</span></Link>
            </li>
          ))}
        </ul>

        {/* 모바일 회원 메뉴 */}
        <div className="mobile-menu-bottom">
          <button type="button" onClick={() => openMemberPage('찜 목록')}>WISHLIST</button>
          <button type="button" onClick={() => openMemberPage('마이페이지')}>MY PAGE</button>
          {member ? <button type="button" onClick={handleLogout}>LOGOUT</button> : <Link to="/login" onClick={handlePageLink}>LOGIN</Link>}
          <Link to="/cart" onClick={handlePageLink}>CART ({cartCount})</Link>
        </div>
      </nav>
    </header>
  );
}