import { useMemo } from 'react';
import type { SizeGuide, SizeGuideType } from '../../ts/sizeGuide';
import { createEmptySizeGuide, getMeasurementOptions, SIZE_GUIDE_TYPE_OPTIONS } from '../../ts/sizeGuide';
import './SizeGuideEditor.css';

// 기존 PRODUCT.SIZEDETAIL JSON 구조를 유지하여 사용자 상세페이지 표와 호환됩니다.
export default function SizeGuideEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const guide = useMemo<SizeGuide | null>(() => {
        if (!value.trim()) return createEmptySizeGuide('NONE');
        try {
            const data = JSON.parse(value);
            if (!data || !SIZE_GUIDE_TYPE_OPTIONS.some(option => option.value === data.type)
                || !Array.isArray(data.columns) || !data.columns.every((column: unknown) => typeof column === 'string')
                || !Array.isArray(data.rows) || !data.rows.every((row: { label?: unknown; values?: unknown }) => row && typeof row.label === 'string' && Array.isArray(row.values) && row.values.every((cell: unknown) => typeof cell === 'string'))) return null;
            return { ...data, unit: data.unit ?? 'cm', notice: data.notice ?? '', model: data.model ?? '', wearingSize: data.wearingSize ?? '' };
        } catch { return null; }
    }, [value]);
    const save = (next: SizeGuide) => onChange(JSON.stringify(next));
    const changeType = (type: SizeGuideType) => {
        if (guide && guide.type !== 'NONE' && !window.confirm('표 유형을 변경하면 현재 표 입력값이 초기화됩니다. 변경하시겠습니까?')) return;
        save(createEmptySizeGuide(type));
    };
    // 예전 일반 텍스트나 다른 형식은 자동 변환하여 소실시키지 않습니다.
    if (!guide) return <section className="size-guide-editor"><h3>SIZE GUIDE</h3><p>기존 내용이 실측표 JSON 형식이 아닙니다. 아래 내용은 그대로 유지됩니다.</p><pre>{value}</pre><button type="button" onClick={() => { if (window.confirm('기존 내용을 새 실측표로 교체하시겠습니까?')) save(createEmptySizeGuide('NONE')); }}>새 실측표로 교체</button></section>;
    return <section className="size-guide-editor">
        <h3>SIZE GUIDE</h3><div className="size-guide-editor__fields">
            <label>표 유형<select aria-label="표 유형" value={guide.type} onChange={e => changeType(e.target.value as SizeGuideType)}>{SIZE_GUIDE_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            {guide.type !== 'NONE' && <label>단위<input aria-label="실측 단위" value={guide.unit} onChange={e => save({ ...guide, unit: e.target.value })} /></label>}
        </div>
        {guide.type !== 'NONE' && <>
            <div className="size-guide-editor__actions"><button type="button" onClick={() => save({ ...guide, columns: [...guide.columns, ''], rows: guide.rows.map(row => ({ ...row, values: [...row.values, ''] })) })}>+ 사이즈 열 추가</button><button type="button" onClick={() => save({ ...guide, rows: [...guide.rows, { label: '', values: guide.columns.map(() => '') }] })}>+ 측정 항목 행 추가</button></div>
            <div className="size-guide-editor__actions">{getMeasurementOptions(guide.type).map(label => <button key={label} type="button" disabled={guide.rows.some(row => row.label === label)} onClick={() => save({ ...guide, rows: [...guide.rows, { label, values: guide.columns.map(() => '') }] })}>+ {label}</button>)}</div>
            <div className="size-guide-editor__table"><table><thead><tr><th>측정 항목 / 사이즈</th>{guide.columns.map((column, columnIndex) => <th key={columnIndex}><input aria-label={`사이즈 ${columnIndex + 1}`} placeholder="예: M" value={column} onChange={e => save({ ...guide, columns: guide.columns.map((c, i) => i === columnIndex ? e.target.value : c) })} /><button type="button" aria-label={`사이즈 ${columnIndex + 1} 삭제`} onClick={() => save({ ...guide, columns: guide.columns.filter((_, i) => i !== columnIndex), rows: guide.rows.map(row => ({ ...row, values: row.values.filter((_, i) => i !== columnIndex) })) })}>삭제</button></th>)}<th>관리</th></tr></thead><tbody>{guide.rows.map((row, rowIndex) => <tr key={rowIndex}><th><input aria-label={`측정 항목 ${rowIndex + 1}`} value={row.label} placeholder="예: LENGTH" onChange={e => save({ ...guide, rows: guide.rows.map((r, i) => i === rowIndex ? { ...r, label: e.target.value } : r) })} /></th>{guide.columns.map((_, columnIndex) => <td key={columnIndex}><input aria-label={`실측 ${rowIndex + 1}-${columnIndex + 1}`} value={row.values[columnIndex] ?? ''} onChange={e => save({ ...guide, rows: guide.rows.map((r, i) => i === rowIndex ? { ...r, values: guide.columns.map((_, j) => j === columnIndex ? e.target.value : r.values[j] ?? '') } : r) })} /></td>)}<td><button type="button" aria-label={`측정 항목 ${rowIndex + 1} 삭제`} onClick={() => save({ ...guide, rows: guide.rows.filter((_, i) => i !== rowIndex) })}>삭제</button></td></tr>)}</tbody></table></div>
            {!guide.rows.length && <p>측정 항목 버튼을 눌러 행을 추가하고 사이즈별 값을 입력해주세요.</p>}
            <div className="size-guide-editor__fields"><label>안내 문구<textarea aria-label="사이즈 안내 문구" value={guide.notice} onChange={e => save({ ...guide, notice: e.target.value })} /></label><label>모델 정보<input aria-label="모델 정보" value={guide.model} onChange={e => save({ ...guide, model: e.target.value })} /></label><label>착용 사이즈<input aria-label="착용 사이즈" value={guide.wearingSize} onChange={e => save({ ...guide, wearingSize: e.target.value })} /></label></div>
        </>}
    </section>;
}
