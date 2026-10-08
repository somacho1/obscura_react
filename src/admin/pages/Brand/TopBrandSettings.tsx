import { useState } from 'react';
import { updateTopBrand } from '../../../api/brandApi';
import type { BrandResponse } from '../../../ts/brand';
import './TopBrandSettings.css';
import BrandImageSettings from './BrandImageSettings';

interface TopBrandSettingsProps {
    brand: BrandResponse;
    onSaved: (brand: BrandResponse) => void;
}

export default function TopBrandSettings({ brand, onSaved }: TopBrandSettingsProps) {
    // 저장 전 입력값과 서버에 저장된 브랜드 정보를 구분합니다.
    const [topBrandYn, setTopBrandYn] = useState<'Y' | 'N'>(brand.topBrandYn ?? 'N');
    const [topSeqNo, setTopSeqNo] = useState(String(brand.topSeqNo ?? 0));
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSave = async () => {
        const sequence = Number(topSeqNo);

        // 빈칸·소수·음수·DB 컬럼 범위 초과를 저장하지 않습니다.
        if (topSeqNo.trim() === '' || !Number.isInteger(sequence)
            || sequence < 0 || sequence > 999999999) {
            setMessage('');
            setError('노출 순서는 0~999999999 사이의 정수로 입력해주세요.');
            return;
        }

        try {
            setSaving(true);
            setMessage('');
            setError('');

            const saved = await updateTopBrand(brand.no, {
                topBrandYn,
                topSeqNo: sequence,
            });

            setTopBrandYn(saved.topBrandYn);
            setTopSeqNo(String(saved.topSeqNo));
            onSaved(saved);
            setMessage('Top Brands 설정을 저장했습니다.');
        } catch (error) {
            setError(error instanceof Error ? error.message : '설정 저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="top-brand-settings">
            <div>
                <h2>TOP BRANDS</h2>
                <p>메인페이지 브랜드 노출 여부와 순서를 설정합니다.</p>
            </div>

            <div className="top-brand-settings-controls">
                <label>
                    <span>메인 노출</span>
                    <select
                        value={topBrandYn}
                        disabled={saving}
                        onChange={(event) => setTopBrandYn(event.target.value as 'Y' | 'N')}
                    >
                        <option value="N">숨김</option>
                        <option value="Y">노출</option>
                    </select>
                </label>

                <label>
                    <span>노출 순서</span>
                    <input
                        type="number"
                        min="0"
                        max="999999999"
                        step="1"
                        value={topSeqNo}
                        disabled={saving}
                        onChange={(event) => setTopSeqNo(event.target.value)}
                    />
                </label>

                <button type="button" disabled={saving} onClick={handleSave}>
                    {saving ? '저장 중...' : '설정 저장'}
                </button>
            </div>

            <p>숫자가 작을수록 먼저 표시됩니다. 같은 순서는 브랜드번호 순으로 표시됩니다.</p>
            {brand.statusNo !== 1 && <p>현재 비활성 브랜드이므로 노출로 저장해도 메인에 표시되지 않습니다.</p>}
            {message && <p role="status">{message}</p>}
            {error && <p className="top-brand-settings-error" role="alert">{error}</p>}
            {message && <p role="status">{message}</p>}
            {error && <p className="top-brand-settings-error" role="alert">{error}</p>}

            {/* 로고·대표 이미지는 등록 즉시 DB에 저장합니다. */}
            <BrandImageSettings brand={brand} onSaved={onSaved} />
        </div>
        
    );
}