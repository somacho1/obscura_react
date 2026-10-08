import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import {
    createMainBanner,
    deleteMainBanner,
    getMainBanners,
    removeMainBannerImage,
    updateMainBanner,
    uploadMainBannerImage,
} from '../../../api/mainBannerApi';
import type { MainBannerResponse } from '../../../ts/mainBanner';
import { getImageUrl } from '../../../ts/imageUrl';
import './AdminBannerPage.css';

const MAX_SEQ_NO = 999999999;

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : '요청 처리에 실패했습니다.';
}

function validateImage(file: File) {
    if (!/\.(jpe?g|jfif|png|webp)$/i.test(file.name)) {
        throw new Error(`${file.name}: JPG, JPEG, JFIF, PNG, WEBP만 등록할 수 있습니다.`);
    }
    if (file.size === 0) {
        throw new Error(`${file.name}: 비어 있는 파일입니다.`);
    }
    if (file.size > 10 * 1024 * 1024) {
        throw new Error(`${file.name}: 이미지 한 장은 최대 10MB까지 등록할 수 있습니다.`);
    }
}

// Oracle NAME 100바이트에 맞춰 파일명으로 배너명을 만듭니다.
function makeBannerName(file: File) {
    const value = file.name.replace(/\.[^.]+$/, '').trim() || '메인 배너';
    const encoder = new TextEncoder();
    let name = '';

    for (const character of value) {
        if (encoder.encode(name + character).length > 100) break;
        name += character;
    }

    return name;
}

function SelectedImage({ file }: { file: File }) {
    const [url, setUrl] = useState('');

    useEffect(() => {
        const preview = URL.createObjectURL(file);
        setUrl(preview);
        return () => URL.revokeObjectURL(preview);
    }, [file]);

    return (
        <div className="banner-selected-image">
            <img src={url} alt={file.name} />
            <span title={file.name}>{file.name}</span>
        </div>
    );
}

// 배너 설정 저장과 순서 저장을 별도로 처리합니다.
function BannerSettings({
    banner,
    locked,
    onBusyChange,
    onSaved,
    onDeleted,
}: {
    banner: MainBannerResponse;
    locked: boolean;
    onBusyChange: (busy: boolean) => void;
    onSaved: (banner: MainBannerResponse) => void;
    onDeleted: (no: number) => void;
}) {
    const [name, setName] = useState(banner.name);
    const [altText, setAltText] = useState(banner.altText ?? '');
    const [statusNo, setStatusNo] = useState(banner.statusNo);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const fileInput = useRef<HTMLInputElement | null>(null);

    const runAction = async (action: () => Promise<void>) => {
        setMessage('');
        setError('');
        onBusyChange(true);

        try {
            await action();
        } catch (error) {
            setError(getErrorMessage(error));
        } finally {
            onBusyChange(false);
        }
    };

    const handleSave = () => {
        if (!name.trim()) {
            setMessage('');
            setError('배너명을 입력해주세요.');
            return;
        }
        if (statusNo === 1 && !banner.imageUrl) {
            setMessage('');
            setError('이미지를 먼저 등록해주세요.');
            return;
        }

        void runAction(async () => {
            const saved = await updateMainBanner(banner.no, {
                name: name.trim(),
                altText: altText.trim(),
                statusNo,
                // 설정 저장에서는 현재 DB 순서를 유지합니다.
                seqNo: banner.seqNo,
            });

            onSaved(saved);
            setName(saved.name);
            setAltText(saved.altText ?? '');
            setStatusNo(saved.statusNo);
            setMessage('설정을 저장했습니다.');
        });
    };

    const handleReplaceImage = (file: File) => {
        try {
            validateImage(file);
        } catch (error) {
            setMessage('');
            setError(getErrorMessage(error));
            return;
        }

        void runAction(async () => {
            const saved = await uploadMainBannerImage(banner.no, file);
            onSaved(saved);
            setMessage('이미지를 저장했습니다.');
        });
    };

    const handleRemoveImage = () => {
        if (!window.confirm('이미지를 등록 해제하고 배너를 숨기시겠습니까?')) return;

        void runAction(async () => {
            const saved = await removeMainBannerImage(banner.no);
            onSaved(saved);
            setStatusNo(0);
            setMessage('이미지를 등록 해제하고 배너를 숨겼습니다.');
        });
    };

    const handleDelete = () => {
        if (!window.confirm(`"${banner.name}" 배너를 삭제하시겠습니까?`)) return;

        void runAction(async () => {
            await deleteMainBanner(banner.no);
            onDeleted(banner.no);
        });
    };

    return (
        <div className="banner-settings">
            <div className="banner-info">
                <input
                    value={name}
                    disabled={locked}
                    aria-label="배너명"
                    placeholder="배너명"
                    onChange={(event) => setName(event.target.value)}
                />
                <input
                    value={altText}
                    disabled={locked}
                    aria-label="이미지 대체 텍스트"
                    placeholder="이미지 설명 (선택)"
                    onChange={(event) => setAltText(event.target.value)}
                />
            </div>

            <div className="banner-status">
                <select
                    value={statusNo}
                    disabled={locked}
                    aria-label={`${banner.name} 노출 여부`}
                    onChange={(event) => setStatusNo(Number(event.target.value))}
                >
                    <option value={1}>노출</option>
                    <option value={0}>숨김</option>
                </select>
                <small>{banner.statusNo === 1 ? '현재 노출 중' : '현재 숨김'}</small>
            </div>

            <div className="banner-row-actions">
                <button type="button" disabled={locked} onClick={handleSave}>
                    설정 저장
                </button>
                <button
                    type="button"
                    className="secondary"
                    disabled={locked}
                    onClick={() => fileInput.current?.click()}
                >
                    {banner.imageUrl ? '이미지 교체' : '이미지 등록'}
                </button>
                <button
                    type="button"
                    className="secondary"
                    disabled={locked || !banner.imageUrl}
                    onClick={handleRemoveImage}
                >
                    이미지 해제
                </button>
                <button type="button" className="danger" disabled={locked} onClick={handleDelete}>
                    삭제
                </button>

                <input
                    ref={fileInput}
                    className="banner-file-input"
                    type="file"
                    accept=".jpg,.jpeg,.jfif,.png,.webp"
                    disabled={locked}
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) handleReplaceImage(file);
                    }}
                />
            </div>

            {message && <p className="banner-success banner-row-notice" role="status">{message}</p>}
            {error && <p className="banner-error banner-row-notice" role="alert">{error}</p>}
        </div>
    );
}

export default function AdminBannerPage() {
    const [banners, setBanners] = useState<MainBannerResponse[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [savingOrder, setSavingOrder] = useState(false);
    const [rowBusy, setRowBusy] = useState(false);
    const [orderChanged, setOrderChanged] = useState(false);
    const [draggedNo, setDraggedNo] = useState<number | null>(null);
    const [dropTargetNo, setDropTargetNo] = useState<number | null>(null);
    const [loadError, setLoadError] = useState('');
    const [errors, setErrors] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [progress, setProgress] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const fileInput = useRef<HTMLInputElement | null>(null);

    const locked = uploading || savingOrder || rowBusy;

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setLoadError('');

        getMainBanners(controller.signal)
            .then((data) => {
                if (controller.signal.aborted) return;
                setBanners([...data].sort((a, b) => a.seqNo - b.seqNo || a.no - b.no));
                setOrderChanged(false);
            })
            .catch((error) => {
                if (!controller.signal.aborted) setLoadError(getErrorMessage(error));
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [reloadKey]);

    // 設定や画像を更新しても、ドラッグで並べた表示順は保持します。
    const handleSaved = (saved: MainBannerResponse) => {
        setBanners((previous) => (
            previous.some((banner) => banner.no === saved.no)
                ? previous.map((banner) => banner.no === saved.no ? saved : banner)
                : [...previous, saved]
        ));
    };

    const handleSelectFiles = (selected: File[]) => {
        setErrors([]);
        setMessage('');

        try {
            selected.forEach(validateImage);
            setFiles(selected);
        } catch (error) {
            setFiles([]);
            setErrors([getErrorMessage(error)]);
            if (fileInput.current) fileInput.current.value = '';
        }
    };

    // 새 배너는現在の一覧の末尾に追加します。
    const handleUploadAll = async () => {
        setErrors([]);
        setMessage('');

        if (files.length === 0) {
            setErrors(['登録할 이미지를 선택해주세요.']);
            return;
        }
        if (orderChanged) {
            setErrors(['변경한 순서를 먼저 저장해주세요.']);
            return;
        }

        const firstOrder = banners.length === 0
            ? 1
            : Math.max(...banners.map((banner) => banner.seqNo)) + 1;

        if (firstOrder + files.length - 1 > MAX_SEQ_NO) {
            setErrors(['노출 순서 범위를 초과했습니다. 목록의 순서를 먼저 저장해주세요.']);
            return;
        }

        setUploading(true);
        const failures: string[] = [];
        const retryFiles: File[] = [];
        let successCount = 0;

        for (let index = 0; index < files.length; index += 1) {
            const file = files[index];
            const seqNo = firstOrder + index;
            let created: MainBannerResponse | null = null;

            setProgress(`${index + 1} / ${files.length} 등록 중: ${file.name}`);

            try {
                validateImage(file);

                created = await createMainBanner({
                    name: makeBannerName(file),
                    altText: '',
                    statusNo: 0,
                    seqNo,
                });
                handleSaved(created);

                const uploaded = await uploadMainBannerImage(created.no, file);
                handleSaved(uploaded);

                const visible = await updateMainBanner(created.no, {
                    name: uploaded.name,
                    altText: uploaded.altText ?? '',
                    statusNo: 1,
                    seqNo,
                });
                handleSaved(visible);
                successCount += 1;
            } catch (error) {
                if (created) {
                    failures.push(
                        `${file.name}: ${getErrorMessage(error)} 아래 목록의 "${created.name}"에서 이어서 처리해주세요.`,
                    );
                } else {
                    retryFiles.push(file);
                    failures.push(`${file.name}: ${getErrorMessage(error)} 등록되지 않았습니다.`);
                }
            }
        }

        setFiles(retryFiles);
        if (fileInput.current) fileInput.current.value = '';
        setErrors(failures);
        setMessage(`${successCount}개 배너를 등록하고 노출했습니다.`);
        setProgress('');
        setUploading(false);
    };

    // 드래그 또는 위·아래 버튼으로 목록의 표시 순서만 변경합니다.
    const moveBanner = (fromNo: number, toNo: number) => {
        if (locked || fromNo === toNo) return;

        const fromIndex = banners.findIndex((banner) => banner.no === fromNo);
        const toIndex = banners.findIndex((banner) => banner.no === toNo);
        if (fromIndex < 0 || toIndex < 0) return;

        const reordered = [...banners];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);

        setBanners(reordered);
        setOrderChanged(true);
        setMessage('');
        setErrors([]);
    };

    const handleDragStart = (event: DragEvent<HTMLDivElement>, no: number) => {
        if (locked) {
            event.preventDefault();
            return;
        }

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(no));
        setDraggedNo(no);
    };

    const handleDrop = (event: DragEvent<HTMLElement>, targetNo: number) => {
        event.preventDefault();

        if (draggedNo !== null) moveBanner(draggedNo, targetNo);
        setDraggedNo(null);
        setDropTargetNo(null);
    };

    // 기존 수정 API로 화면 위쪽부터 1, 2, 3... 순서를 저장합니다.
    // 일부 요청이 실패하면 완료로 표시하지 않고 재시도할 수 있게 합니다.
    const handleSaveOrder = async () => {
        setSavingOrder(true);
        setErrors([]);
        setMessage('');

        const failures: string[] = [];

        for (let index = 0; index < banners.length; index += 1) {
            const banner = banners[index];

            try {
                const saved = await updateMainBanner(banner.no, {
                    name: banner.name,
                    altText: banner.altText ?? '',
                    statusNo: banner.statusNo,
                    seqNo: index + 1,
                });
                handleSaved(saved);
            } catch (error) {
                failures.push(`${banner.name}: ${getErrorMessage(error)}`);
            }
        }

        setErrors(failures);
        if (failures.length === 0) {
            setOrderChanged(false);
            setMessage('배너 순서를 저장했습니다. 메인페이지를 새로고침하면 반영됩니다.');
        } else {
            setOrderChanged(true);
            setMessage('일부 순서가 저장되지 않았습니다. 순서 저장을 다시 눌러주세요.');
        }

        setSavingOrder(false);
    };

    return (
        <div className="admin-banner-page">
            <div className="banner-page-heading">
                <h2>메인 배너 관리</h2>
                <p>이미지를 여러 장 등록하고, 목록을 끌어서 원하는 순서로 배치하세요.</p>
            </div>

            {loading ? (
                <p role="status">배너를 불러오는 중입니다.</p>
            ) : loadError ? (
                <div className="banner-error" role="alert">
                    <p>{loadError}</p>
                    <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
                        다시 불러오기
                    </button>
                </div>
            ) : (
                <>
                    <section className="banner-upload-panel" aria-label="배너 이미지 등록">
                        <h3>배너 등록</h3>
                        <p>JPG·JPEG·JFIF·PNG·WEBP / 한 장당 최대 10MB</p>

                        <div className="banner-upload-controls">
                            <label>
                                <span>이미지 여러 장 선택</span>
                                <input
                                    ref={fileInput}
                                    type="file"
                                    multiple
                                    accept=".jpg,.jpeg,.jfif,.png,.webp"
                                    disabled={locked}
                                    onChange={(event) => handleSelectFiles(Array.from(event.target.files ?? []))}
                                />
                            </label>

                            <button
                                type="button"
                                disabled={locked || orderChanged || files.length === 0}
                                onClick={() => void handleUploadAll()}
                            >
                                {uploading ? '등록 중…' : `선택 이미지 등록${files.length ? ` (${files.length})` : ''}`}
                            </button>
                        </div>

                        <p className="banner-help">
                            새 이미지는 목록 맨 뒤에 추가되며, 업로드 완료 후 자동으로 노출됩니다.
                        </p>

                        {files.length > 0 && (
                            <div className="banner-selected-list">
                                {files.map((file, index) => (
                                    <SelectedImage key={`${index}-${file.name}-${file.lastModified}`} file={file} />
                                ))}
                            </div>
                        )}
                    </section>

                    <div className="banner-list-toolbar">
                        <div>
                            <h3>등록된 배너 <span>{banners.length}</span></h3>
                            <p>왼쪽 이동 핸들을 끌거나 위·아래 버튼으로 순서를 변경하세요.</p>
                        </div>
                        <button
                            type="button"
                            disabled={locked || banners.length === 0}
                            onClick={() => void handleSaveOrder()}
                        >
                            {savingOrder ? '저장 중…' : '순서 저장'}
                        </button>
                    </div>

                    {orderChanged && (
                        <p className="banner-order-pending" role="status">
                            순서가 변경되었습니다. ‘순서 저장’을 눌러 반영해주세요.
                        </p>
                    )}
                    {progress && <p className="banner-notice" role="status">{progress}</p>}
                    {message && <p className="banner-notice" role="status">{message}</p>}
                    {errors.length > 0 && (
                        <ul className="banner-error" role="alert">
                            {errors.map((error, index) => <li key={index}>{error}</li>)}
                        </ul>
                    )}

                    {banners.length === 0 ? (
                        <p className="banner-empty">등록된 배너가 없습니다.</p>
                    ) : (
                        <div className="banner-list">
                            {banners.map((banner, index) => (
                                <article
                                    key={banner.no}
                                    className={`banner-row${draggedNo === banner.no ? ' dragging' : ''}${dropTargetNo === banner.no ? ' drop-target' : ''}`}
                                    onDragOver={(event) => {
                                        if (locked || draggedNo === null) return;
                                        event.preventDefault();
                                        event.dataTransfer.dropEffect = 'move';
                                        setDropTargetNo(banner.no);
                                    }}
                                    onDrop={(event) => handleDrop(event, banner.no)}
                                >
                                    <div className="banner-move">
                                        <div
                                            className={`banner-drag-handle${locked ? ' disabled' : ''}`}
                                            draggable={!locked}
                                            title="끌어서 순서 변경"
                                            onDragStart={(event) => handleDragStart(event, banner.no)}
                                            onDragEnd={() => {
                                                setDraggedNo(null);
                                                setDropTargetNo(null);
                                            }}
                                        >
                                            <svg width="18" height="24" viewBox="0 0 18 24" aria-hidden="true">
                                                {[6, 12, 18].map((y) => (
                                                    <g key={y} fill="currentColor">
                                                        <circle cx="6" cy={y} r="1.5" />
                                                        <circle cx="12" cy={y} r="1.5" />
                                                    </g>
                                                ))}
                                            </svg>
                                            <span>{index + 1}</span>
                                        </div>

                                        <div className="banner-move-buttons">
                                            <button
                                                type="button"
                                                className="secondary"
                                                disabled={locked || index === 0}
                                                aria-label={`${banner.name} 위로 이동`}
                                                onClick={() => moveBanner(banner.no, banners[index - 1].no)}
                                            >
                                                ↑
                                            </button>
                                            <button
                                                type="button"
                                                className="secondary"
                                                disabled={locked || index === banners.length - 1}
                                                aria-label={`${banner.name} 아래로 이동`}
                                                onClick={() => moveBanner(banner.no, banners[index + 1].no)}
                                            >
                                                ↓
                                            </button>
                                        </div>
                                    </div>

                                    <div className="banner-thumbnail">
                                        {banner.imageUrl ? (
                                            <img
                                                src={getImageUrl(banner.imageUrl)}
                                                alt={banner.altText ?? banner.name}
                                                draggable={false}
                                            />
                                        ) : (
                                            <span>이미지 없음</span>
                                        )}
                                    </div>

                                    <BannerSettings
                                        banner={banner}
                                        locked={locked}
                                        onBusyChange={setRowBusy}
                                        onSaved={handleSaved}
                                        onDeleted={(no) => {
                                            setBanners((previous) => previous.filter((item) => item.no !== no));
                                        }}
                                    />
                                </article>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}