import './Footer.css';

// 기존 OBSCURA 로고
import logo from '../../../assets/images/obscura/logo.svg';

export default function Footer() {

  // 페이지 최상단으로 부드럽게 이동
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <footer className="site-footer">

      <div className="footer-inner">

        {/* =========================
            상단
            로고 / 위로가기
        ========================= */}
        <div className="footer-head">

          <a href="/" className="footer-logo" aria-label="OBSCURA 홈">
            <img src={logo} alt="OBSCURA" />
          </a>

          {/* 텍스트 없이 화살표만 사용하는 TOP 버튼 */}
          <button
            type="button"
            className="footer-top-button"
            onClick={scrollToTop}
            aria-label="페이지 상단으로 이동"
          >
            TOP
          </button>

        </div>

        {/* =========================
            주요 정보
        ========================= */}
        <div className="footer-content">

          {/* 고객센터 */}
          <div className="footer-customer">
            <p className="footer-label">CUSTOMER SERVICE</p>

            <a href="tel:025120910" className="footer-phone">
              02-512-0910
            </a>

            <p className="footer-hours">
              MON - FRI 13:00 - 17:00
              <br />
              SAT / SUN / HOLIDAY OFF
            </p>

            <a
              href="mailto:cs@obscura-store.com"
              className="footer-email"
            >
              cs@obscura-store.com
            </a>
          </div>

          {/* 이용안내 */}
          <nav className="footer-nav" aria-label="Footer 메뉴">
            <p className="footer-label">INFORMATION</p>

            <ul>
              <li><a href="#">TERMS OF USE</a></li>
              <li><a href="#">PRIVACY POLICY</a></li>
              <li><a href="#">SERVICE</a></li>
              <li><a href="#">MEMBERSHIP</a></li>
            </ul>
          </nav>

          {/* SNS */}
          <div className="footer-follow">
            <p className="footer-label">FOLLOW</p>

            <div className="footer-follow-links">
              <a href="#">INSTAGRAM</a>
              <a href="#">FACEBOOK</a>
              <a href="#">Q&amp;A</a>
            </div>
          </div>

        </div>

        {/* =========================
            회사 정보
        ========================= */}
        <div className="footer-company">

          <div className="footer-company-info">
            <span>(주)이공오</span>
            <span>B. 532-87-01598</span>
            <span>C. KIM JUN HYUN</span>
            <span>A. 36, Seongsui-ro 24-gil, Seongdong-gu, Seoul</span>
            <span>L. 2020-서울성동-03012</span>
          </div>

          <span className="footer-copy">
            © OBSCURA. ALL RIGHTS RESERVED.
          </span>

        </div>

      </div>

    </footer>
  );
}