import { useEffect, useRef, useState } from 'react';
import { getProduct, updateMdPick } from '../../../api/productApi';

interface Props {
    productNo: number;
    disabled?: boolean;
    onBusyChange?: (busy: boolean) => void;
}

export default function AdminMdPickPanel({
    productNo,
    disabled = false,
    onBusyChange,
}: Props) {
    const [mdPickYn, setMdPickYn] = useState<'Y' | 'N'>('N');
    const [mdSeqNo, setMdSeqNo] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const savingRef = useRef(false);
    const versionRef = useRef(0);

    useEffect(() => {
        const version = ++versionRef.current;
        setLoading(true);
        setError('');
        setMessage('');

        const load = async () => {
            try {
                // 상세 API 대신 추천 설정이 포함된 기본 상품 API를 사용합니다.
                const product = await getProduct(productNo);
                if (version !== versionRef.current) return;

                setMdPickYn(product.mdPickYn ?? 'N');
                setMdSeqNo(product.mdSeqNo ?? 0);
            } catch (err) {
                if (version === versionRef.current) {
                    setError(err instanceof Error ? err.message : '설정을 불러오지 못했습니다.');
                }
            } finally {
                if (version === versionRef.current) setLoading(false);
            }
        };

        void load();

        return () => {
            versionRef.current += 1;
        };
    }, [productNo, retryCount]);

    const save = async () => {
        if (disabled || loading || savingRef.current) return;

        if (!Number.isSafeInteger(mdSeqNo) || mdSeqNo < 0 || mdSeqNo > 999999) {
            setError('표시 순서는 0~999999 사이의 정수로 입력해주세요.');
            return;
        }

        const version = versionRef.current;
        savingRef.current = true;
        setSaving(true);
        setError('');
        setMessage('');
        onBusyChange?.(true);

        try {
            const product = await updateMdPick(productNo, mdPickYn, mdSeqNo);
            if (version !== versionRef.current) return;

            setMdPickYn(product.mdPickYn);
            setMdSeqNo(product.mdSeqNo);
            setMessage('MD 추천 설정이 저장되었습니다.');
        } catch (err) {
            if (version === versionRef.current) {
                setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
            }
        } finally {
            savingRef.current = false;
            onBusyChange?.(false);
            if (version === versionRef.current) setSaving(false);
        }
    };

    return (
        <section className="admin-product-create__section">
            <div className="admin-product-create__section-title">
                <span>05</span>
                <div>
                    <h2>MD PICKS</h2>
                    <p>메인 추천 여부와 표시 순서를 별도로 저장합니다.</p>
                </div>
            </div>

            {loading ? (
                <p role="status">MD 설정을 불러오는 중입니다.</p>
            ) : (
                <>
                    <div className="admin-product-create__grid">
                        <label className="admin-product-create__field">
                            <span>MD 추천 여부</span>
                            <select
                                value={mdPickYn}
                                disabled={disabled || saving}
                                onChange={event => {
                                    setMdPickYn(event.target.value as 'Y' | 'N');
                                    setMessage('');
                                }}
                            >
                                <option value="N">추천 안 함</option>
                                <option value="Y">MD 추천</option>
                            </select>
                        </label>

                        <label className="admin-product-create__field">
                            <span>표시 순서 · 작은 숫자 우선</span>
                            <input
                                type="number"
                                min={0}
                                max={999999}
                                step={1}
                                value={mdSeqNo}
                                disabled={disabled || saving}
                                onChange={event => {
                                    setMdSeqNo(Number(event.target.value));
                                    setMessage('');
                                }}
                            />
                        </label>
                    </div>

                    <div className="admin-product-create__actions">
                        <button
                            type="button"
                            className="admin-product-create__cancel"
                            disabled={disabled || saving}
                            onClick={() => setRetryCount(prev => prev + 1)}
                        >
                            다시 조회
                        </button>
                        <button
                            type="button"
                            className="admin-product-create__submit"
                            disabled={disabled || saving}
                            onClick={() => void save()}
                        >
                            {saving ? '저장 중...' : 'MD 설정 저장'}
                        </button>
                    </div>
                </>
            )}

            {error && <p role="alert">{error}</p>}
            {message && <p role="status">{message}</p>}
        </section>
    );
}