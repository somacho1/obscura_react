import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
    getBankRefund,
    requestBankRefund,
    completeBankRefund,
} from '../../api/bankRefundApi';
import type { BankRefundForm, BankRefundInfo } from '../../api/bankRefundApi';
import './BankRefundPanel.css';

interface Props {
    orderNo: number;
    memberNo: number;
    admin?: boolean;
    disabled?: boolean;
    onUpdated: () => void;
    onBusyChange?: (busy: boolean) => void;
}

const EMPTY_FORM: BankRefundForm = {
    reason: '',
    bank: '',
    account: '',
    holder: '',
};

export default function BankRefundPanel({
    orderNo,
    memberNo,
    admin = false,
    disabled = false,
    onUpdated,
    onBusyChange,
}: Props) {
    const [info, setInfo] = useState<BankRefundInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    const [form, setForm] = useState<BankRefundForm>({ ...EMPTY_FORM });
    const busyRef = useRef(false);
    const versionRef = useRef(0);

    useEffect(() => {
        const version = ++versionRef.current;
        let active = true;
        setInfo(null);
        setForm({ ...EMPTY_FORM });
        setError('');
        setLoading(true);

        getBankRefund(orderNo, memberNo, admin)
            .then((data) => {
                if (!active) return;
                if (data.orderNo !== orderNo) throw new Error('환불 주문정보가 일치하지 않습니다.');
                setInfo(data);
            })
            .catch((err: unknown) => {
                if (active) setError(err instanceof Error ? err.message : '환불정보 조회에 실패했습니다.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
            if (versionRef.current === version) versionRef.current += 1;
        };
    }, [orderNo, memberNo, admin, retry]);

    function changeField(key: keyof BankRefundForm, value: string) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    async function submit(event?: FormEvent<HTMLFormElement>) {
        event?.preventDefault();
        if (disabled || busyRef.current || !info) return;

        const data: BankRefundForm = {
            reason: form.reason.trim(),
            bank: form.bank.trim(),
            account: form.account.replace(/[\s-]/g, ''),
            holder: form.holder.trim(),
        };

        if (!admin) {
            if (!data.reason || new TextEncoder().encode(data.reason).length > 200) {
                setError('취소 사유는 200바이트 이내로 입력해주세요.');
                return;
            }
            if (!data.bank || !data.holder || !/^\d{6,30}$/.test(data.account)) {
                setError('은행·예금주와 올바른 계좌번호를 입력해주세요.');
                return;
            }
        } else {
            const message = [
                `환불 금액: ${info.amount.toLocaleString('ko-KR')}원`,
                `은행: ${info.bank}`,
                `계좌: ${info.account}`,
                `예금주: ${info.holder}`,
                '',
                '실제 송금을 완료하셨습니까?',
                '완료 처리하면 주문이 취소되고 재고가 복구됩니다.',
            ].join('\n');

            if (!window.confirm(message)) return;
        }

        const version = versionRef.current;
        busyRef.current = true;
        setBusy(true);
        onBusyChange?.(true);
        setError('');

        try {
            const result = admin
                ? await completeBankRefund(orderNo)
                : await requestBankRefund(orderNo, memberNo, data);

            if (version !== versionRef.current) return;
            if (result.orderNo !== orderNo) throw new Error('환불 주문정보가 일치하지 않습니다.');

            setInfo(result);
            onUpdated();
        } catch (err) {
            if (version === versionRef.current) {
                setError(err instanceof Error ? err.message : '환불 처리에 실패했습니다.');
            }
        } finally {
            busyRef.current = false;
            if (version === versionRef.current) {
                setBusy(false);
                onBusyChange?.(false);
            }
        }
    }

    const pending = info?.cancelStatusNo === 3;
    const completed = info?.cancelStatusNo === 2 && info.paymentStatusNo === 3;
    const canRequest = info?.paymentStatusNo === 1
        && [2, 3].includes(info.orderStatusNo)
        && info.cancelStatusNo === 0;

    return (
        <section className="bank-refund">
            <h2>무통장입금 환불</h2>

            {error && (
                <div className="bank-refund__error" role="alert">
                    <p>{error}</p>
                    <button
                        type="button"
                        disabled={busy || disabled || loading}
                        onClick={() => setRetry((prev) => prev + 1)}
                    >
                        다시 조회
                    </button>
                </div>
            )}

            {loading ? (
                <p role="status">환불정보를 불러오는 중입니다.</p>
            ) : info && (
                <>
                    {pending || completed ? (
                        <>
                            <p className="bank-refund__status">
                                {completed ? '환불 완료' : '환불 요청 접수 / 출고 보류'}
                            </p>
                            <dl>
                                <div><dt>환불 금액</dt><dd>{info.amount.toLocaleString('ko-KR')}원</dd></div>
                                <div><dt>취소 사유</dt><dd>{info.reason}</dd></div>
                                <div><dt>은행</dt><dd>{info.bank}</dd></div>
                                <div><dt>계좌번호</dt><dd>{info.account}</dd></div>
                                <div><dt>예금주</dt><dd>{info.holder}</dd></div>
                            </dl>

                            {admin && pending && (
                                <>
                                    <p>실제 송금을 완료한 뒤 처리해주세요.</p>
                                    <button
                                        className="bank-refund__button"
                                        type="button"
                                        disabled={busy || disabled}
                                        onClick={() => void submit()}
                                    >
                                        {busy ? '처리 중…' : '환불 완료 처리'}
                                    </button>
                                </>
                            )}
                        </>
                    ) : !admin && canRequest ? (
                        <form onSubmit={(event) => void submit(event)}>
                            <p>출고 전 주문 전체 취소를 요청합니다. 환불받을 계좌를 입력해주세요.</p>
                            <fieldset disabled={busy || disabled}>
                                <label>
                                    취소 사유
                                    <input
                                        value={form.reason}
                                        maxLength={200}
                                        onChange={(e) => changeField('reason', e.target.value)}
                                        required
                                    />
                                </label>
                                <label>
                                    은행명
                                    <input
                                        value={form.bank}
                                        maxLength={50}
                                        placeholder="예: 국민은행"
                                        onChange={(e) => changeField('bank', e.target.value)}
                                        required
                                    />
                                </label>
                                <label>
                                    계좌번호
                                    <input
                                        value={form.account}
                                        inputMode="numeric"
                                        maxLength={40}
                                        onChange={(e) => changeField(
                                            'account', e.target.value.replace(/[^\d-]/g, ''),
                                        )}
                                        required
                                    />
                                </label>
                                <label>
                                    예금주
                                    <input
                                        value={form.holder}
                                        maxLength={50}
                                        onChange={(e) => changeField('holder', e.target.value)}
                                        required
                                    />
                                </label>
                                <button className="bank-refund__button" type="submit">
                                    {busy ? '접수 중…' : '취소·환불 요청'}
                                </button>
                            </fieldset>
                        </form>
                    ) : (
                        <p>{admin ? '접수된 환불 요청이 없습니다.' : '현재 주문은 출고 전 환불 요청 대상이 아닙니다.'}</p>
                    )}
                </>
            )}
        </section>
    );
}