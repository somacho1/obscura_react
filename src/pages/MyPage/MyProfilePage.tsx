import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMember, updateMember } from '../../api/memberApi';
import type { MemberUpdateRequest } from '../../ts/member';
import './MyProfilePage.css';

const EMPTY_FORM: MemberUpdateRequest = {
    name: '',
    email: '',
    phone: '',
};

export default function MyProfilePage() {
    const { member, loginMember } = useAuth();
    const memberNo = member?.no;
    const [form, setForm] = useState<MemberUpdateRequest>({ ...EMPTY_FORM });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [retry, setRetry] = useState(0);

    // 중복 저장 및 회원 변경 후 이전 요청 결과 반영을 방지합니다.
    const savingRef = useRef(false);
    const versionRef = useRef(0);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    useEffect(() => {
        const version = ++versionRef.current;
        let active = true;

        setForm({ ...EMPTY_FORM });
        setLoaded(false);
        setError('');
        setMessage('');
        savingRef.current = false;
        setSaving(false);

        if (!memberNo) {
            setLoading(false);
            return;
        }

        setLoading(true);

        getMember(memberNo)
            .then((data) => {
                if (!active) return;
                setForm({
                    name: data.name ?? '',
                    email: data.email ?? '',
                    phone: data.phone ?? '',
                });
                setLoaded(true);
            })
            .catch((err: unknown) => {
                if (active) {
                    setError(err instanceof Error ? err.message : '회원정보 조회에 실패했습니다.');
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
            if (versionRef.current === version) versionRef.current += 1;
        };
    }, [memberNo, retry]);

    function changeField(key: keyof MemberUpdateRequest, value: string) {
        setForm((prev) => ({ ...prev, [key]: value }));
        setMessage('');
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!member || !loaded || savingRef.current) return;

        const data: MemberUpdateRequest = {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
        };

        setError('');
        setMessage('');

        if (!data.name) {
            setError('이름을 입력해주세요.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            setError('올바른 이메일 주소를 입력해주세요.');
            return;
        }
        if (!/^\d{9,11}$/.test(data.phone.replace(/-/g, ''))) {
            setError('연락처를 숫자 9~11자리로 입력해주세요.');
            return;
        }

        const version = versionRef.current;
        savingRef.current = true;
        setSaving(true);

        try {
            const updated = await updateMember(member.no, data);
            if (version !== versionRef.current) return;

            setForm({
                name: updated.name,
                email: updated.email,
                phone: updated.phone,
            });

            // Context와 localStorage를 함께 갱신해 새로고침 후에도 유지합니다.
            loginMember({
                no: updated.no,
                id: updated.id,
                name: updated.name,
                email: updated.email,
                role: updated.role,
            });
            setMessage('회원정보를 저장했습니다.');
        } catch (err) {
            if (version === versionRef.current) {
                setError(err instanceof Error ? err.message : '회원정보 저장에 실패했습니다.');
            }
        } finally {
            if (version === versionRef.current) {
                savingRef.current = false;
                setSaving(false);
            }
        }
    }

    return (
        <main className="my-profile">
            <header className="my-profile__heading">
                <div>
                    <span className="my-profile__eyebrow">OBSCURA / MY PAGE</span>
                    <h1>Personal details</h1>
                    <p>회원정보 수정</p>
                </div>
                <Link to="/mypage">마이페이지 ↗</Link>
            </header>

            {!member ? (
                <div className="my-profile__state">
                    <p>로그인 후 이용하실 수 있습니다.</p>
                    <Link className="my-profile__button" to="/login">로그인</Link>
                </div>
            ) : (
                <>
                    {error && (
                        <div className="my-profile__message" role="alert">
                            <p>{error}</p>
                            {!loaded && (
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => setRetry((prev) => prev + 1)}
                                >
                                    다시 조회
                                </button>
                            )}
                        </div>
                    )}

                    {loading ? (
                        <div className="my-profile__state" role="status">
                            회원정보를 불러오는 중입니다.
                        </div>
                    ) : loaded && (
                        <form className="my-profile__form" onSubmit={handleSubmit}>
                            <fieldset disabled={saving}>
                                <label>
                                    아이디
                                    <input value={member.id} readOnly />
                                    <span className="my-profile__hint">아이디는 변경할 수 없습니다.</span>
                                </label>

                                <label>
                                    이름
                                    <input
                                        value={form.name}
                                        onChange={(e) => changeField('name', e.target.value)}
                                        autoComplete="name"
                                        maxLength={50}
                                        required
                                    />
                                </label>

                                <label>
                                    이메일
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => changeField('email', e.target.value)}
                                        autoComplete="email"
                                        maxLength={100}
                                        required
                                    />
                                </label>

                                <label>
                                    연락처
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => changeField(
                                            'phone',
                                            e.target.value.replace(/[^\d-]/g, ''),
                                        )}
                                        autoComplete="tel"
                                        placeholder="010-1234-5678"
                                        maxLength={20}
                                        required
                                    />
                                </label>

                                {message && (
                                    <p className="my-profile__success" role="status">{message}</p>
                                )}

                                <div className="my-profile__actions">
                                    <button type="submit" className="my-profile__button my-profile__button--dark">
                                        {saving ? '저장 중…' : '변경사항 저장'}
                                    </button>
                                </div>
                            </fieldset>
                        </form>
                    )}
                </>
            )}
        </main>
    );
}