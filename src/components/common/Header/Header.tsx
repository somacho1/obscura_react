import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCartItems } from '../../../api/cartApi';
import { useAuth } from '../../../context/AuthContext';
import logo from '../../../assets/images/obscura/logo.svg';
import searchIcon from '../../../assets/images/obscura/ico_sch_black.svg';
import likeIcon from '../../../assets/images/obscura/ico_qk_like_black.svg';
import myPageIcon from '../../../assets/images/obscura/ico_my_black.svg';
import bagIcon from '../../../assets/images/obscura/ico_bag_black.svg';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const { member, logoutMember } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  // 로그인 회원의 장바구니 상품 종류 수를 표시합니다.
  useEffect(() => {
    let active = true;
    if (!member) { setCartCount(0); return; }
    getCartItems(member.no).then((items) => { if (active) setCartCount(items.length); })
      .catch((error) => { console.error('장바구니 개수 조회 실패:', error); if (active) setCartCount(0); });
    return () => { active = false; };
  }, [member]);

  // 검색 영역 밖 클릭과 ESC 키로 열린 패널을 닫습니다.
  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (searchOpen && searchRef.current && !searchRef.current.contains(event.target as Node)) setSearchOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSearchOpen(false); setMenuOpen(false); }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => { document.removeEventListener('mousedown', handleOutside); document.removeEventListener('keydown', handleEscape); };
  }, [searchOpen]);

  // 화면이 넓어지면 모바일 메뉴를 닫습니다.
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth > 1024) setMenuOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = keyword.trim();
    if (!value) return;
    // 검색 결과 페이지가 준비되면 여기서 navigate(`/search?q=${encodeURIComponent(value)}`)로 연결합니다.
    console.log('검색어:', value);
    setSearchOpen(false);
  };

  const handleLogout = () => { logoutMember(); setMenuOpen(false); navigate('/'); };
  // 목록·마이페이지 라우트가 생기기 전에는 로그인 상태를 확인하고 준비 중임을 알려줍니다.
  const openMemberPage = (page: '찜 목록' | '마이페이지') => {
    setMenuOpen(false);
    if (!member) { navigate('/login'); return; }
    alert(`${page} 페이지를 준비 중입니다.`);
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="header-left-area">
          <button type="button" className={`header-menu-button ${menuOpen ? 'is-open' : ''}`} aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => { setMenuOpen((value) => !value); setSearchOpen(false); }}><span /><span /><span /></button>
          <nav className="header-desktop-nav" aria-label="주요 메뉴">
            <a href="#" className="shop-link">SHOP</a><a href="#">MEN</a><a href="#">WOMEN</a><a href="#">SHOES</a><a href="#">ACC</a><a href="#" className="sale-link">SALE</a>
          </nav>
        </div>

        <Link to="/" className="header-logo" aria-label="OBSCURA 홈" onClick={() => { setMenuOpen(false); setSearchOpen(false); }}><img src={logo} alt="OBSCURA" /></Link>

        <div className="header-right-area" ref={searchRef}>
          <button type="button" className="header-icon-button" aria-label="검색" aria-expanded={searchOpen} onClick={() => { setSearchOpen((value) => !value); setMenuOpen(false); }}><img src={searchIcon} alt="" /></button>
          <button type="button" className="header-icon-button header-secondary" aria-label="찜 목록" onClick={() => openMemberPage('찜 목록')}><img src={likeIcon} alt="" /></button>
          <button type="button" className="header-icon-button header-secondary" aria-label="마이페이지" onClick={() => openMemberPage('마이페이지')}><img src={myPageIcon} alt="" /></button>
          {/* 로그인·로그아웃은 아이콘과 겹치지 않도록 텍스트로 표시합니다. */}
          {member ? <button type="button" className="header-account" onClick={handleLogout}>LOGOUT</button> : <Link to="/login" className="header-account" onClick={() => setMenuOpen(false)}>LOGIN</Link>}
          <Link to="/cart" className="header-icon-link header-cart" aria-label={`장바구니 ${cartCount}개`} onClick={() => setMenuOpen(false)}><img src={bagIcon} alt="" />{cartCount > 0 && <span className="header-cart-count">{cartCount}</span>}</Link>
          {searchOpen && <div className="search-panel"><form className="search-form" onSubmit={handleSearch}><label htmlFor="header-search" className="sr-only">상품 검색</label><input id="header-search" type="search" value={keyword} placeholder="브랜드 또는 상품명" autoComplete="off" autoFocus onChange={(event) => setKeyword(event.target.value)} /><button type="submit">검색</button></form></div>}
        </div>
      </div>

      <nav id="mobile-menu" className={`mobile-menu ${menuOpen ? 'is-open' : ''}`} aria-label="모바일 메뉴" aria-hidden={!menuOpen}>
        <ul><li><a href="#" onClick={() => setMenuOpen(false)}>SHOP <span>↗</span></a></li><li><a href="#" onClick={() => setMenuOpen(false)}>MEN <span>↗</span></a></li><li><a href="#" onClick={() => setMenuOpen(false)}>WOMEN <span>↗</span></a></li><li><a href="#" onClick={() => setMenuOpen(false)}>SHOES <span>↗</span></a></li><li><a href="#" onClick={() => setMenuOpen(false)}>ACC <span>↗</span></a></li><li><a href="#" className="sale-link" onClick={() => setMenuOpen(false)}>SALE <span>↗</span></a></li></ul>
        <div className="mobile-menu-bottom"><button type="button" onClick={() => openMemberPage('찜 목록')}>WISHLIST</button><button type="button" onClick={() => openMemberPage('마이페이지')}>MY PAGE</button>{member ? <button type="button" onClick={handleLogout}>LOGOUT</button> : <Link to="/login" onClick={() => setMenuOpen(false)}>LOGIN</Link>}<Link to="/cart" onClick={() => setMenuOpen(false)}>CART ({cartCount})</Link></div>
      </nav>
    </header>
  );
}
