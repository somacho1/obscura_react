import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMemberAddresses, createMemberAddress,updateMemberAddress,deleteMemberAddress } from '../../api/memberAddressApi';
import type { MemberAddressRequest, MemberAddressResponse } from '../../ts/memberAddress';
import type { PostcodeAddress } from '../../ts/postcode';
import './MyAddressPage.css';

type AddressForm = Omit<MemberAddressRequest, 'mno'>;

const EMPTY_FORM: AddressForm = {
    addressName: '',
    receiver: '',
    phone: '',
    zipcode: '',
    address1: '',
    address2: '',
    defaultYn: 'N',
};

export default function MyAddressPage() {
    const { member } = useAuth();
    const memberNo = member?.no;
    const [addresses, setAddresses] = useState<MemberAddressResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [retry, setRetry] = useState(0);
    const [formOpen, setFormOpen] = useState(false);
    const [editingNo, setEditingNo] = useState<number | null>(null);
    const [form, setForm] = useState<AddressForm>({ ...EMPTY_FORM });

    // 중복 요청과 회원 변경 후 이전 응답 반영을 방지합니다.
    const busyRef = useRef(false);
    const versionRef = useRef(0);
    const formVersionRef = useRef(0);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    useEffect(() => {
        const version = ++versionRef.current;
        let active = true;

        setAddresses([]);
        setError('');
        setMessage('');
        setFormOpen(false);
        setEditingNo(null);
        formVersionRef.current += 1;
        busyRef.current = false;
        setBusy(false);

        if (!memberNo) {
            setLoading(false);
            return;
        }

        setLoading(true);
        getMemberAddresses(memberNo)
            .then((data) => {
                if (active) setAddresses(data);
            })
            .catch((err: unknown) => {
                if (active) {
                    setError(err instanceof Error ? err.message : '배송지 조회에 실패했습니다.');
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

    function openForm(address?: MemberAddressResponse) {
        if (busyRef.current) return;

        formVersionRef.current += 1;
        setError('');
        setMessage('');
        setEditingNo(address?.no ?? null);
        setForm(address ? {
            addressName: address.addressName ?? '',
            receiver: address.receiver,
            phone: address.phone,
            zipcode: address.zipcode,
            address1: address.address1,
            address2: address.address2 ?? '',
            defaultYn: address.defaultYn,
        } : {
            ...EMPTY_FORM,
            receiver: member?.name ?? '',
            defaultYn: addresses.length === 0 ? 'Y' : 'N',
        });
        setFormOpen(true);

        window.requestAnimationFrame(() => {
            document.getElementById('my-address-form')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });
    }

    function closeForm() {
        if (busyRef.current) return;
        formVersionRef.current += 1;
        setFormOpen(false);
        setEditingNo(null);
    }

    function changeField<K extends keyof AddressForm>(key: K, value: AddressForm[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    // 주문서에서 사용하는 주소 검색 스크립트를 재사용합니다.
    function searchAddress() {
        if (busyRef.current) return;
        if (!window.kakao?.Postcode) {
            setError('주소 검색 서비스를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
            return;
        }

        const version = versionRef.current;
        const formVersion = formVersionRef.current;
        setError('');

        new window.kakao.Postcode({
            oncomplete: (data: PostcodeAddress) => {
                if (
                    busyRef.current || version !== versionRef.current
                    || formVersion !== formVersionRef.current
                ) return;

                const road = data.userSelectedType === 'R';
                let address = road ? data.roadAddress : data.jibunAddress;

                if (road) {
                    const extra: string[] = [];
                    if (data.bname && /[동로가]$/.test(data.bname)) extra.push(data.bname);
                    if (data.buildingName && data.apartment === 'Y') extra.push(data.buildingName);
                    if (extra.length > 0) address += ` (${extra.join(', ')})`;
                }

                setForm((prev) => ({
                    ...prev,
                    zipcode: data.zonecode,
                    address1: address,
                    address2: '',
                }));

                window.requestAnimationFrame(() => {
                    document.getElementById('my-address-detail')?.focus();
                });
            },
        }).open();
    }

    // 처리 후 다시 조회해 서버에서 변경한 기본 배송지 상태까지 반영합니다.
    async function mutate(action: () => Promise<unknown>, successMessage: string) {
        if (!memberNo || busyRef.current) return;

        const version = versionRef.current;
        busyRef.current = true;
        setBusy(true);
        setError('');
        setMessage('');

        try {
            await action();
            if (version !== versionRef.current) return;

            formVersionRef.current += 1;
            setFormOpen(false);
            setEditingNo(null);
            setMessage(successMessage);

            try {
                const data = await getMemberAddresses(memberNo);
                if (version === versionRef.current) setAddresses(data);
            } catch {
                if (version === versionRef.current) {
                    setAddresses([]);
                    setError('처리는 완료됐지만 목록을 불러오지 못했습니다. 다시 조회해주세요.');
                }
            }
        } catch (err) {
            if (version === versionRef.current) {
                setError(err instanceof Error ? err.message : '배송지 처리에 실패했습니다.');
            }
        } finally {
            if (version === versionRef.current) {
                busyRef.current = false;
                setBusy(false);
            }
        }
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!memberNo || busyRef.current) return;

        const data: MemberAddressRequest = {
            mno: memberNo,
            addressName: form.addressName.trim(),
            receiver: form.receiver.trim(),
            phone: form.phone.trim(),
            zipcode: form.zipcode.trim(),
            address1: form.address1.trim(),
            address2: form.address2.trim(),
            defaultYn: form.defaultYn,
        };

        setError('');

        if (!data.addressName || !data.receiver) {
            setError('배송지명과 받는 사람을 입력해주세요.');
            return;
        }
        if (!/^\d{9,11}$/.test(data.phone.replace(/-/g, ''))) {
            setError('올바른 연락처를 입력해주세요.');
            return;
        }
        if (!/^\d{5}$/.test(data.zipcode) || !data.address1) {
            setError('주소 검색으로 배송지를 선택해주세요.');
            return;
        }

        void mutate(
            () => editingNo === null
                ? createMemberAddress(data)
                : updateMemberAddress(editingNo, data),
            editingNo === null ? '배송지를 등록했습니다.' : '배송지를 수정했습니다.',
        );
    }

    function setDefault(address: MemberAddressResponse) {
        if (!memberNo) return;

        void mutate(() => updateMemberAddress(address.no, {
            mno: memberNo,
            addressName: address.addressName ?? '',
            receiver: address.receiver,
            phone: address.phone,
            zipcode: address.zipcode,
            address1: address.address1,
            address2: address.address2 ?? '',
            defaultYn: 'Y',
        }), '기본 배송지를 변경했습니다.');
    }

    function removeAddress(address: MemberAddressResponse) {
        if (busyRef.current) return;
        if (!window.confirm(`'${address.addressName || '배송지'}'를 삭제하시겠습니까?`)) return;
        void mutate(() => deleteMemberAddress(address.no), '배송지를 삭제했습니다.');
    }

    const isCurrentDefault = addresses.some(
        (address) => address.no === editingNo && address.defaultYn === 'Y',
    );

    return (
        <main className="my-address">
            <header className="my-address__heading">
                <div>
                    <span className="my-address__eyebrow">OBSCURA / MY PAGE</span>
                    <h1>Address book</h1>
                    <p>배송지 관리</p>
                </div>
                <Link to="/mypage">마이페이지 ↗</Link>
            </header>

            {!member ? (
                <div className="my-address__state">
                    <p>로그인 후 이용하실 수 있습니다.</p>
                    <Link className="my-address__button" to="/login">로그인</Link>
                </div>
            ) : (
                <>
                    <div className="my-address__toolbar">
                        <span>저장 배송지 <strong>{addresses.length}</strong></span>
                        <button
                            className="my-address__button"
                            type="button"
                            disabled={loading || busy}
                            onClick={() => openForm()}
                        >
                            배송지 추가 +
                        </button>
                    </div>

                    {error && (
                        <div className="my-address__message" role="alert">
                            <p>{error}</p>
                            <button
                                type="button"
                                disabled={busy || loading}
                                onClick={() => setRetry((prev) => prev + 1)}
                            >
                                다시 조회
                            </button>
                        </div>
                    )}
                    {message && <p className="my-address__success" role="status">{message}</p>}

                    {formOpen && (
                        <form id="my-address-form" className="my-address__form" onSubmit={handleSubmit}>
                            <h2>{editingNo === null ? '배송지 추가' : '배송지 수정'}</h2>

                            <fieldset disabled={busy}>
                                <div className="my-address__fields">
                                    <label>
                                        배송지명
                                        <input
                                            value={form.addressName}
                                            onChange={(e) => changeField('addressName', e.target.value)}
                                            placeholder="집, 회사 등"
                                            maxLength={30}
                                            required
                                        />
                                    </label>
                                    <label>
                                        받는 사람
                                        <input
                                            value={form.receiver}
                                            onChange={(e) => changeField('receiver', e.target.value)}
                                            autoComplete="name"
                                            maxLength={50}
                                            required
                                        />
                                    </label>
                                    <label className="my-address__wide">
                                        연락처
                                        <input
                                            type="tel"
                                            value={form.phone}
                                            onChange={(e) => changeField(
                                                'phone', e.target.value.replace(/[^\d-]/g, ''),
                                            )}
                                            placeholder="010-1234-5678"
                                            autoComplete="tel"
                                            maxLength={20}
                                            required
                                        />
                                    </label>

                                    <div className="my-address__wide">
                                        <label htmlFor="my-address-zipcode">주소</label>
                                        <div className="my-address__search">
                                            <input
                                                id="my-address-zipcode"
                                                value={form.zipcode}
                                                placeholder="우편번호"
                                                readOnly
                                            />
                                            <button type="button" onClick={searchAddress}>주소 검색</button>
                                        </div>
                                        <input
                                            value={form.address1}
                                            aria-label="기본주소"
                                            placeholder="기본주소"
                                            readOnly
                                        />
                                    </div>

                                    <label className="my-address__wide">
                                        상세주소
                                        <input
                                            id="my-address-detail"
                                            value={form.address2}
                                            onChange={(e) => changeField('address2', e.target.value)}
                                            placeholder="동·호수 등 상세주소"
                                            maxLength={200}
                                        />
                                    </label>
                                </div>

                                <label className="my-address__check">
                                    <input
                                        type="checkbox"
                                        checked={form.defaultYn === 'Y'}
                                        disabled={addresses.length === 0 || isCurrentDefault}
                                        onChange={(e) => changeField('defaultYn', e.target.checked ? 'Y' : 'N')}
                                    />
                                    기본 배송지로 설정
                                </label>

                                <div className="my-address__form-actions">
                                    <button type="button" className="my-address__button" onClick={closeForm}>
                                        취소
                                    </button>
                                    <button type="submit" className="my-address__button my-address__button--dark">
                                        {busy ? '저장 중…' : '저장'}
                                    </button>
                                </div>
                            </fieldset>
                        </form>
                    )}

                    {loading ? (
                        <div className="my-address__state" role="status">
                            배송지를 불러오는 중입니다.
                        </div>
                    ) : addresses.length > 0 ? (
                        <div className="my-address__list">
                            {addresses.map((address) => (
                                <article className="my-address__card" key={address.no}>
                                    <div className="my-address__card-heading">
                                        <h2>{address.addressName || '배송지'}</h2>
                                        {address.defaultYn === 'Y' && <span>기본 배송지</span>}
                                    </div>

                                    <p className="my-address__receiver">
                                        {address.receiver}<span>{address.phone}</span>
                                    </p>
                                    <p className="my-address__location">
                                        ({address.zipcode}) {address.address1}
                                        {address.address2 && <><br />{address.address2}</>}
                                    </p>

                                    <div className="my-address__card-actions">
                                        {address.defaultYn !== 'Y' && (
                                            <button type="button" disabled={busy} onClick={() => setDefault(address)}>
                                                기본 배송지로 설정
                                            </button>
                                        )}
                                        <button type="button" disabled={busy} onClick={() => openForm(address)}>
                                            수정
                                        </button>
                                        <button type="button" disabled={busy} onClick={() => removeAddress(address)}>
                                            삭제
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : !error && !formOpen && (
                        <div className="my-address__state">
                            <p>등록된 배송지가 없습니다.</p>
                            <p>배송지 추가 버튼으로 등록해주세요.</p>
                        </div>
                    )}
                </>
            )}
        </main>
    );
}