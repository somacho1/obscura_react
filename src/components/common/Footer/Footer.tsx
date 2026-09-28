import './Footer.css';

// 공식 SNS 주소
const INSTAGRAM_URL = 'https://www.instagram.com/obscura_store.kr/';
const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_xdKxbxhC';

export default function Footer() {
  // TOP 버튼을 누르면 페이지 맨 위로 이동합니다.
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <>
      <footer className="site-footer">
        <div className="footer-inner">
          <button type="button" className="footer-top" onClick={scrollToTop} aria-label="페이지 맨 위로 이동">TOP ↑</button>

          {/* 원본 사이트의 간결한 메뉴 구성 */}
          <nav className="footer-menu" aria-label="푸터 메뉴">
            <a href="#">TERMS OF USE</a>
            <a href="#">PRIVACY POLICY</a>
            <a href="#">SERVICE</a>
            <a href="#">MEMBERSHIP</a>
          </nav>

          {/* 사업자 정보 */}
          <div className="footer-business">
            <p>(주)이공오</p>
            <p><span>B. 532-87-01598</span><span>C. KIM JOON HYUN</span></p>
            <p>A. 36, Seongsui-ro 24-gil, Seongdong-gu, Seoul</p>
            <p><span>L. 2020-서울성동-03012</span><span>T. 02-512-0910</span><span>E. cs@obscura-store.com</span></p>
          </div>

          {/* SNS 아이콘을 누르면 공식 계정이 새 탭으로 열립니다. */}
          <div className="footer-social" aria-label="공식 SNS">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="OBSCURA 인스타그램">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" aria-label="OBSCURA 카카오채널">
              <svg viewBox="0 0 28 28" aria-hidden="true">
                <path fill="currentColor" d="M14 2C7.4 2 2 6.2 2 11.5c0 3.3 2.1 6.2 5.3 7.9L6 25l6.3-4.1c.6.1 1.1.1 1.7.1 6.6 0 12-4.2 12-9.5S20.6 2 14 2Z" />
                <text x="14" y="15.5" fill="#fff" fontSize="8.5" fontWeight="700" textAnchor="middle" fontFamily="Arial, sans-serif">Ch</text>
              </svg>
            </a>
          </div>

          <p className="footer-copyright">© 2023 obscura</p>
        </div>
      </footer>

      {/* 추후 AI 챗봇을 구현하면 이 버튼의 동작을 변경하면 됩니다. */}
      <a className="footer-qa" href="mailto:cs@obscura-store.com?subject=OBSCURA%20Q%26A" aria-label="Q&A 이메일 문의">Q &amp; A</a>
    </>
  );
}