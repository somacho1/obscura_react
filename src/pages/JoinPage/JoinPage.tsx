import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { checkMemberEmail, checkMemberId, join } from '../../api/memberApi';

import './JoinPage.css';

const idRegex = /^[A-Za-z0-9]{4,20}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/;
const emailIdRegex = /^[A-Za-z0-9._%+-]+$/;
const domainRegex = /^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const phoneRegex = /^010-\d{4}-\d{4}$/;

export default function JoinPage() {
    const navigate = useNavigate();

    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [name, setName] = useState('');
    const [emailId, setEmailId] = useState('');
    const [emailDomain, setEmailDomain] = useState('naver.com');
    const [customDomain, setCustomDomain] = useState('');
    const [phone, setPhone] = useState('');

    const [idChecked, setIdChecked] = useState(false);
    const [idAvailable, setIdAvailable] = useState(false);
    const [emailChecked, setEmailChecked] = useState(false);
    const [emailAvailable, setEmailAvailable] = useState(false);
    const [loading, setLoading] = useState(false);

    const selectedDomain = emailDomain === 'custom' ? customDomain.trim() : emailDomain;
    const fullEmail = emailId.trim() && selectedDomain ? `${emailId.trim()}@${selectedDomain}` : '';

    const handleIdChange = (value: string) => {
        setId(value);
        setIdChecked(false);
        setIdAvailable(false);
    };

    const resetEmailCheck = () => {
        setEmailChecked(false);
        setEmailAvailable(false);
    };

    const handleEmailIdChange = (value: string) => {
        setEmailId(value);
        resetEmailCheck();
    };

    const handleDomainChange = (value: string) => {
        setEmailDomain(value);
        if (value !== 'custom') setCustomDomain('');
        resetEmailCheck();
    };

    const handleCustomDomainChange = (value: string) => {
        setCustomDomain(value);
        resetEmailCheck();
    };

    const handlePhoneChange = (value: string) => {
        const numbers = value.replace(/\D/g, '').slice(0, 11);

        if (numbers.length <= 3) setPhone(numbers);
        else if (numbers.length <= 7) setPhone(`${numbers.slice(0, 3)}-${numbers.slice(3)}`);
        else setPhone(`${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`);
    };

    const handleCheckId = async () => {
        if (!idRegex.test(id.trim())) {
            alert('아이디는 영문과 숫자로 4~20자 입력해주세요.');
            return;
        }

        try {
            const exists = await checkMemberId(id.trim());
            setIdChecked(true);
            setIdAvailable(!exists);
            alert(exists ? '이미 사용 중인 아이디입니다.' : '사용 가능한 아이디입니다.');
        } catch (error) {
            alert(error instanceof Error ? error.message : '아이디 중복확인에 실패했습니다.');
        }
    };

    const handleCheckEmail = async () => {
        if (!emailIdRegex.test(emailId.trim())) {
            alert('올바른 이메일 아이디를 입력해주세요.');
            return;
        }

        if (!domainRegex.test(selectedDomain)) {
            alert('올바른 이메일 주소를 입력해주세요.');
            return;
        }

        try {
            const exists = await checkMemberEmail(fullEmail);
            setEmailChecked(true);
            setEmailAvailable(!exists);
            alert(exists ? '이미 사용 중인 이메일입니다.' : '사용 가능한 이메일입니다.');
        } catch (error) {
            alert(error instanceof Error ? error.message : '이메일 중복확인에 실패했습니다.');
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!id.trim() || !password || !passwordConfirm || !name.trim() || !emailId.trim() || !selectedDomain || !phone.trim()) {
            alert('모든 항목을 입력해주세요.');
            return;
        }

        if (!idRegex.test(id.trim())) {
            alert('아이디는 영문과 숫자로 4~20자 입력해주세요.');
            return;
        }

        if (!idChecked || !idAvailable) {
            alert('아이디 중복확인을 해주세요.');
            return;
        }

        if (!passwordRegex.test(password)) {
            alert('비밀번호는 8~20자의 영문과 숫자를 포함해야 합니다.');
            return;
        }

        if (password !== passwordConfirm) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }

        if (!emailIdRegex.test(emailId.trim()) || !domainRegex.test(selectedDomain)) {
            alert('올바른 이메일 주소를 입력해주세요.');
            return;
        }

        if (!emailChecked || !emailAvailable) {
            alert('이메일 중복확인을 해주세요.');
            return;
        }

        if (!phoneRegex.test(phone)) {
            alert('전화번호는 010-0000-0000 형식으로 입력해주세요.');
            return;
        }

        try {
            setLoading(true);
            await join({ id: id.trim(), password, name: name.trim(), email: fullEmail, phone });
            alert('회원가입이 완료되었습니다.');
            navigate('/login');
        } catch (error) {
            console.error('회원가입 실패:', error);
            alert(error instanceof Error ? error.message : '회원가입에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="join-page">
            <section className="join-box">
                <div className="join-heading">
                    <h1>JOIN</h1>
                    <p>OBSCURA MEMBERSHIP</p>
                </div>

                <form className="join-form" onSubmit={handleSubmit}>
                    <div className="join-field">
                        <label htmlFor="join-id">ID</label>
                        <div className="join-input-button">
                            <input id="join-id" type="text" value={id} onChange={(e) => handleIdChange(e.target.value)} placeholder="영문/숫자 4~20자" autoComplete="username" />
                            <button type="button" onClick={handleCheckId}>CHECK</button>
                        </div>
                        {idChecked && <p className={idAvailable ? 'join-valid' : 'join-invalid'}>{idAvailable ? '사용 가능한 아이디입니다.' : '이미 사용 중인 아이디입니다.'}</p>}
                    </div>

                    <div className="join-field">
                        <label htmlFor="join-password">PASSWORD</label>
                        <input id="join-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="영문 + 숫자 8~20자" autoComplete="new-password" />
                    </div>

                    <div className="join-field">
                        <label htmlFor="join-password-confirm">PASSWORD CONFIRM</label>
                        <input id="join-password-confirm" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="비밀번호 확인" autoComplete="new-password" />
                        {passwordConfirm && <p className={password === passwordConfirm ? 'join-valid' : 'join-invalid'}>{password === passwordConfirm ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.'}</p>}
                    </div>

                    <div className="join-field">
                        <label htmlFor="join-name">NAME</label>
                        <input id="join-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" autoComplete="name" />
                    </div>

                    <div className="join-field">
                        <label>EMAIL</label>
                        <div className="join-email-row">
                            <input type="text" value={emailId} onChange={(e) => handleEmailIdChange(e.target.value)} placeholder="이메일" aria-label="이메일 아이디" />
                            <span className="join-email-at">@</span>

                            {emailDomain === 'custom' ? (
                                <input type="text" value={customDomain} onChange={(e) => handleCustomDomainChange(e.target.value)} placeholder="example.com" aria-label="이메일 도메인 직접입력" />
                            ) : (
                                <div className="join-domain-preview">{emailDomain}</div>
                            )}

                            <select value={emailDomain} onChange={(e) => handleDomainChange(e.target.value)} aria-label="이메일 도메인 선택">
                                <option value="naver.com">naver.com</option>
                                <option value="gmail.com">gmail.com</option>
                                <option value="daum.net">daum.net</option>
                                <option value="kakao.com">kakao.com</option>
                                <option value="nate.com">nate.com</option>
                                <option value="custom">직접입력</option>
                            </select>
                        </div>

                        <div className="join-email-check-row">
                            <span>{fullEmail || '이메일 주소를 입력해주세요.'}</span>
                            <button type="button" onClick={handleCheckEmail}>CHECK EMAIL</button>
                        </div>

                        {emailChecked && <p className={emailAvailable ? 'join-valid' : 'join-invalid'}>{emailAvailable ? '사용 가능한 이메일입니다.' : '이미 사용 중인 이메일입니다.'}</p>}
                    </div>

                    <div className="join-field">
                        <label htmlFor="join-phone">PHONE</label>
                        <input id="join-phone" type="tel" value={phone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="010-0000-0000" autoComplete="tel" inputMode="numeric" />
                    </div>

                    <button type="submit" className="join-submit" disabled={loading}>{loading ? 'JOINING...' : 'JOIN'}</button>
                </form>

                <div className="join-login">
                    <span>ALREADY A MEMBER?</span>
                    <Link to="/login">LOGIN</Link>
                </div>
            </section>
        </main>
    );
}