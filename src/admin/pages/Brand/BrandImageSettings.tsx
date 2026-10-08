import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { removeBrandImage, uploadBrandImage } from '../../../api/brandApi';
import type { BrandImageType } from '../../../api/brandApi';
import type { BrandResponse } from '../../../ts/brand';
import { getImageUrl } from '../../../ts/imageUrl';
import './BrandImageSettings.css';

interface BrandImageSettingsProps {
    brand: BrandResponse;
    onSaved: (brand: BrandResponse) => void;
}

interface ImageFieldProps extends BrandImageSettingsProps {
    type: BrandImageType;
    busy: boolean;
    onBusyChange: (busy: boolean) => void;
}

// 로고·대표 이미지 각각의 미리보기와 업로드를 담당합니다.
function ImageField({ brand, type, onSaved, busy, onBusyChange }: ImageFieldProps) {
    const title = type === 'logo' ? '브랜드 로고' : '대표 이미지';
    const imageUrl = type === 'logo' ? brand.logoUrl : brand.visualUrl;
    const [preview, setPreview] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // 업로드 미리보기 교체·종료 시 임시 URL을 정리합니다.
    useEffect(() => {
        if (!preview) return;
        return () => URL.revokeObjectURL(preview);
    }, [preview]);

    const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || busy) return;

        setMessage('');
        setError('');

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
            || !/\.(jpe?g|png|webp)$/i.test(file.name)) {
            setError('JPG, JPEG, PNG, WEBP 파일만 등록할 수 있습니다.');
            return;
        }

        if (file.size === 0 || file.size > 10 * 1024 * 1024) {
            setError('빈 파일은 등록할 수 없으며, 이미지 용량은 최대 10MB입니다.');
            return;
        }

        try {
            onBusyChange(true);
            setPreview(URL.createObjectURL(file));

            const saved = await uploadBrandImage(brand.no, type, file);
            onSaved(saved);
            setMessage(`${title}를 저장했습니다.`);
        } catch (error) {
            setError(error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.');
        } finally {
            setPreview('');
            onBusyChange(false);
        }
    };

    const handleRemove = async () => {
        if (busy || !imageUrl) return;
        if (!window.confirm(`${title} 등록을 해제하시겠습니까?`)) return;

        try {
            onBusyChange(true);
            setMessage('');
            setError('');

            const saved = await removeBrandImage(brand.no, type);
            onSaved(saved);
            setMessage(`${title} 등록을 해제했습니다.`);
        } catch (error) {
            setError(error instanceof Error ? error.message : '등록 해제에 실패했습니다.');
        } finally {
            onBusyChange(false);
        }
    };

    const displayUrl = preview || getImageUrl(imageUrl);

    return (
        <div className={`brand-image-field brand-image-field--${type}`}>
            <h3>{title}</h3>

            <div className="brand-image-preview">
                {displayUrl
                    ? <img src={displayUrl} alt={`${brand.name} ${title}`} />
                    : <span>등록된 이미지가 없습니다.</span>}
            </div>

            <div className="brand-image-actions">
                <label className={`brand-image-upload ${busy ? 'is-disabled' : ''}`}>
                    {busy ? '처리 중...' : imageUrl ? '이미지 교체' : '이미지 등록'}
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={busy}
                        onChange={handleUpload}
                    />
                </label>

                <button type="button" disabled={busy || !imageUrl} onClick={handleRemove}>
                    등록 해제
                </button>
            </div>

            {message && <p role="status">{message}</p>}
            {error && <p className="brand-image-error" role="alert">{error}</p>}
        </div>
    );
}

export default function BrandImageSettings({ brand, onSaved }: BrandImageSettingsProps) {
    // 두 이미지를 동시에 저장해 응답이 서로의 상태를 덮어쓰지 않도록 합니다.
    const [busy, setBusy] = useState(false);

    return (
        <div className="brand-image-settings">
            <p>JPG·PNG·WEBP / 최대 10MB. 이미지 등록·교체·등록 해제는 즉시 저장됩니다.</p>
            <div className="brand-image-settings-grid">
                <ImageField
                    brand={brand}
                    type="logo"
                    onSaved={onSaved}
                    busy={busy}
                    onBusyChange={setBusy}
                />
                <ImageField
                    brand={brand}
                    type="visual"
                    onSaved={onSaved}
                    busy={busy}
                    onBusyChange={setBusy}
                />
            </div>
        </div>
    );
}