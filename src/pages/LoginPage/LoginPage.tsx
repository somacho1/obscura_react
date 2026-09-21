import {
    useState,
    type FormEvent,
} from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { login } from '../../api/memberApi';
import { useAuth } from '../../context/AuthContext';

import './LoginPage.css';

export default function LoginPage() {
    const navigate = useNavigate();

    const {
        member,
        loginMember,
    } = useAuth();

    const [id, setId] = useState('');
    const [password, setPassword] =
        useState('');

    const [error, setError] =
        useState('');

    const [loading, setLoading] =
        useState(false);

    /**
     * 로그인 처리
     */
    const handleLogin = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        setError('');

        if (!id.trim()) {
            setError(
                '아이디를 입력해주세요.',
            );
            return;
        }

        if (!password) {
            setError(
                '비밀번호를 입력해주세요.',
            );
            return;
        }

        try {
            setLoading(true);

            const loginResponse =
                await login({
                    id: id.trim(),
                    password,
                });

            /**
             * 로그인 성공 회원정보를
             * AuthContext에 저장
             */
            loginMember(loginResponse);

            /**
             * 로그인 성공 후 메인 이동
             */
            navigate('/');
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError(
                    '로그인 중 오류가 발생했습니다.',
                );
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * 이미 로그인되어 있는 경우
     */
    if (member) {
        return (
            <main className="login-page">
                <section className="login-box">
                    <h1>LOGIN</h1>

                    <p className="login-description">
                        {member.name}님이
                        로그인되어 있습니다.
                    </p>

                    <Link
                        to="/"
                        className="login-home-button"
                    >
                        GO TO SHOP
                    </Link>
                </section>
            </main>
        );
    }

    return (
        <main className="login-page">
            <section className="login-box">
                <div className="login-title">
                    <h1>LOGIN</h1>

                    <p>
                        Sign in to your OBSCURA
                        account.
                    </p>
                </div>

                <form
                    className="login-form"
                    onSubmit={handleLogin}
                >
                    <div className="login-field">
                        <label htmlFor="login-id">
                            ID
                        </label>

                        <input
                            id="login-id"
                            type="text"
                            value={id}
                            onChange={(event) =>
                                setId(
                                    event.target
                                        .value,
                                )
                            }
                            placeholder="아이디"
                            autoComplete="username"
                        />
                    </div>

                    <div className="login-field">
                        <label
                            htmlFor="login-password"
                        >
                            PASSWORD
                        </label>

                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(
                                    event.target
                                        .value,
                                )
                            }
                            placeholder="비밀번호"
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <p className="login-error">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="login-submit"
                        disabled={loading}
                    >
                        {loading
                            ? 'SIGNING IN...'
                            : 'LOGIN'}
                    </button>
                </form>

                <div className="login-links">
                    <a href="#">
                        FIND ID
                    </a>

                    <a href="#">
                        FIND PASSWORD
                    </a>

                    <a href="#">
                        JOIN
                    </a>
                </div>
            </section>
        </main>
    );
}