import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './MyPage.css';

type MyMenu = {
    key: string;
    english: string;
    title: string;
    description: string;
    to: string | null;
};

// 기능 구현 후 to에 경로를 넣으면 해당 메뉴가 링크로 전환됩니다.
const MY_MENUS: MyMenu[] = [
    {
        key: 'orders',
        english: 'Orders',
        title: '주문·배송',
        description: '주문 내역과 배송 상태를 확인하세요.',
        to: '/mypage/orders',
    },
    {
        key: 'wishlist',
        english: 'Wishlist',
        title: '찜한 상품',
        description: '마음에 담아 둔 상품을 모아보세요.',
        to: '/mypage/wishlist',
    },
    {
        key: 'addresses',
        english: 'Address book',
        title: '배송지 관리',
        description: '자주 사용하는 배송지를 관리하세요.',
        to: '/mypage/addresses',
    },
    {
        key: 'profile',
        english: 'Personal details',
        title: '회원정보 수정',
        description: '회원정보와 비밀번호를 관리하세요.',
        to: '/mypage/profile',
    },
];

function ArrowIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M5 19 19 5M5 5h14v14"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default function MyPage() {
    const { member } = useAuth();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    if (!member) {
        return (
            <main className="my-page my-page--guest">
                <span className="my-page__eyebrow">OBSCURA / MY PAGE</span>
                <h1 className="my-page__title">My account</h1>
                <p className="my-page__guest-message">로그인 후 이용하실 수 있습니다.</p>
                <Link className="my-page__login" to="/login">
                    로그인
                    <ArrowIcon />
                </Link>
            </main>
        );
    }

    return (
        <main className="my-page">
            <header className="my-page__heading">
                <div>
                    <span className="my-page__eyebrow">OBSCURA / MY PAGE</span>
                    <h1 className="my-page__title">My account</h1>
                    <p className="my-page__subtitle">마이페이지</p>
                </div>
                <Link className="my-page__shopping-link" to="/products">
                    쇼핑 계속하기
                    <ArrowIcon />
                </Link>
            </header>

            {/* 기본 회원정보는 상단에 간결하게 표시합니다. */}
            <section className="my-page__profile" aria-label="회원정보">
                <div className="my-page__identity">
                    <h2 className="my-page__member-name">
                        {member.name}
                        <span>님</span>
                    </h2>
                    <p className="my-page__email">{member.email}</p>
                </div>
                <dl className="my-page__member-id">
                    <dt>MEMBER ID</dt>
                    <dd>{member.id}</dd>
                </dl>
            </section>

            <section className="my-page__menu-section" aria-labelledby="my-menu-title">
                <div className="my-page__section-heading">
                    <h2 id="my-menu-title">내 쇼핑 정보</h2>
                    <span>YOUR ACCOUNT</span>
                </div>

                <div className="my-page__menus">
                    {MY_MENUS.map((menu) => {
                        const content = (
                            <>
                                <div className="my-page__menu-top">
                                    <span className="my-page__menu-english">{menu.english}</span>
                                    {menu.to ? (
                                        <span className="my-page__menu-arrow"><ArrowIcon /></span>
                                    ) : (
                                        <span className="my-page__menu-pending">준비 중</span>
                                    )}
                                </div>
                                <div className="my-page__menu-content">
                                    <h3>{menu.title}</h3>
                                    <p>{menu.description}</p>
                                </div>
                            </>
                        );

                        // 준비 중인 메뉴에는 클릭 동작을 넣지 않습니다.
                        return menu.to ? (
                            <Link className="my-page__menu my-page__menu--link" to={menu.to} key={menu.key}>
                                {content}
                            </Link>
                        ) : (
                            <article className="my-page__menu" key={menu.key}>
                                {content}
                            </article>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}