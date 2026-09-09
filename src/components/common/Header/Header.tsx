import { useEffect, useRef, useState } from 'react';
import './Header.css';

// 기존 Obscura 헤더 이미지
import logo from '../../../assets/images/obscura/logo.svg';
import searchIcon from '../../../assets/images/obscura/ico_sch_black.svg';
import likeIcon from '../../../assets/images/obscura/ico_qk_like_black.svg';
import myPageIcon from '../../../assets/images/obscura/ico_my_black.svg';
import loginIcon from '../../../assets/images/obscura/ico_login_black.svg';
import bagIcon from '../../../assets/images/obscura/ico_bag_black.svg';

export default function Header() {
  // 모바일 메뉴 / 검색창 상태
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');

  const searchRef = useRef<HTMLDivElement>(null);

  // PC 화면으로 커지면 모바일 메뉴 닫기
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setMobileMenuOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 검색창 외부 클릭 시 닫기
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        searchOpen &&
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [searchOpen]);

  // ESC 누르면 검색창 / 모바일 메뉴 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // 검색 제출
  // 실제 상품 검색 API는 Node.js 백엔드 구현 후 연결
  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const searchKeyword = keyword.trim();

    if (!searchKeyword) {
      alert('검색어를 입력해주세요.');
      return;
    }

    console.log('검색어:', searchKeyword);
    setSearchOpen(false);
  };

  // 모바일 메뉴 열기 / 닫기
  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
    setSearchOpen(false);
  };

  return (
    <header className="site-header">
      <div className="header-inner">

        {/* =========================
            왼쪽 메뉴
        ========================= */}
        <nav className="header-left" aria-label="주요 메뉴">
          <ul>
            <li>
              <a href="#" className="shop-link">
                SHOP
              </a>
            </li>

            {/* PC에서만 표시 */}
            <li className="desktop-category"><a href="#">MEN</a></li>
            <li className="desktop-category"><a href="#">WOMEN</a></li>
            <li className="desktop-category"><a href="#">SHOES</a></li>
            <li className="desktop-category"><a href="#">ACC</a></li>
            <li className="desktop-category sale-menu"><a href="#">SALE</a></li>
          </ul>
        </nav>

        {/* =========================
            중앙 로고
            모든 화면 크기에서 중앙 유지
        ========================= */}
        <a href="/" className="header-logo" aria-label="OBSCURA 홈">
          <img src={logo} alt="OBSCURA" />
        </a>

        {/* =========================
            오른쪽 메뉴
        ========================= */}
        <div className="header-right-area" ref={searchRef}>

          {/* 검색 */}
          <button
            type="button"
            className="header-icon-button search-button"
            aria-label="검색"
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((prev) => !prev);
              setMobileMenuOpen(false);
            }}
          >
            <img src={searchIcon} alt="" />
          </button>

          {/* PC : 찜 */}
          <a href="#" className="header-icon-link pc-util" aria-label="찜 목록">
            <img src={likeIcon} alt="" />
          </a>

          {/* PC : 마이페이지 */}
          <a href="#" className="header-icon-link pc-util" aria-label="마이페이지">
            <img src={myPageIcon} alt="" />
          </a>

          {/* PC : 로그인 */}
          <a href="#" className="header-icon-link pc-util" aria-label="로그인">
            <img src={loginIcon} alt="" />
          </a>

          {/* PC + 태블릿 : 장바구니 */}
          <a href="#" className="header-icon-link cart-button tablet-cart" aria-label="장바구니">
            <img src={bagIcon} alt="" />
            <span className="cart-count">0</span>
          </a>

          {/* 태블릿 / 모바일 햄버거 */}
          <button
            type="button"
            className={`menu-button ${mobileMenuOpen ? 'active' : ''}`}
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            onClick={toggleMobileMenu}
          >
            <span />
            <span />
            <span />
          </button>

          {/* 검색 버튼 클릭 시 표시 */}
          {searchOpen && (
            <div className="search-panel">
              <form className="search-form" onSubmit={handleSearch}>
                <label htmlFor="header-search" className="sr-only">
                  상품 검색
                </label>

                <input
                  id="header-search"
                  type="search"
                  value={keyword}
                  placeholder="브랜드 또는 상품명"
                  autoComplete="off"
                  autoFocus
                  onChange={(event) => setKeyword(event.target.value)}
                />

                <button type="submit">검색</button>
              </form>
            </div>
          )}
        </div>

        {/* =========================
            태블릿 / 모바일 메뉴
        ========================= */}
        <div
          id="mobile-menu"
          className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}
          aria-hidden={!mobileMenuOpen}
        >
          <ul>
            <li className="sale-menu">
              <a href="#">
                SALE
                <span>›</span>
              </a>
            </li>

            <li>
              <a href="#">
                MEN
                <span>›</span>
              </a>
            </li>

            <li>
              <a href="#">
                WOMEN
                <span>›</span>
              </a>
            </li>

            <li>
              <a href="#">
                SHOES
                <span>›</span>
              </a>
            </li>

            <li>
              <a href="#">
                ACC
                <span>›</span>
              </a>
            </li>

            {/* 모바일 메뉴 안의 회원 관련 기능 */}
            <li className="mobile-member-menu">
              <a href="#">
                WISHLIST
                <span>›</span>
              </a>
            </li>

            <li className="mobile-member-menu">
              <a href="#">
                MY PAGE
                <span>›</span>
              </a>
            </li>

            <li className="mobile-member-menu">
              <a href="#">
                LOGIN
                <span>›</span>
              </a>
            </li>

            <li className="mobile-member-menu mobile-cart-menu">
              <a href="#">
                CART
                <strong>0</strong>
              </a>
            </li>
          </ul>
        </div>

      </div>
    </header>
  );
}