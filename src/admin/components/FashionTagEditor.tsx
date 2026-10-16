import { useId, useState } from 'react';
import type { FashionAnalysis, FashionTag, FashionTaxonomy, TagGroup } from '../../api/fashionAiApi';
interface Props { taxonomy: FashionTaxonomy; tags: FashionTag[]; analysis?: FashionAnalysis | null; onChange: (tags: FashionTag[]) => void; disabled?: boolean; }
const keyOf = (tag: FashionTag) => `${tag.group}:${tag.label.trim().toLowerCase()}`;
export default function FashionTagEditor({taxonomy, tags, analysis, onChange, disabled}: Props) {
    const [group,setGroup] = useState<TagGroup>('style');
    const [label,setLabel] = useState('');
    const [error,setError] = useState('');
    const listId = useId();
    function add() {
        const raw = label.trim().toLowerCase();
        const canonical = taxonomy.aliases[group]?.[raw] ?? raw;
        if (!canonical) return;
        const tag = {group, label:canonical, score:0};
        if (canonical.includes(':') || new TextEncoder().encode(keyOf(tag)).length > 50) {setError('태그 이름을 짧게 입력하고 콜론(:)을 제외해주세요.'); return;}
        if (tags.length >= 20) {setError('태그는 최대 20개입니다.'); return;}
        if (tags.some(item => keyOf(item) === keyOf(tag))) {setError('이미 선택한 태그입니다.'); return;}
        onChange([...tags,tag]); setLabel(''); setError('');
    }
    return <fieldset disabled={disabled}>
        {analysis && <div className="fashion-ai__groups">{taxonomy.groups.map(item => {
            const candidates = analysis.groups[item.source];
            if (!candidates?.length) return null;
            return <div key={item.key}><h3>{item.label}</h3><div className="fashion-ai__chips">{candidates.map(candidate => {
                const tag = {group:item.key,...candidate};
                const checked = tags.some(value => keyOf(value) === keyOf(tag));
                return <label key={candidate.label} className={checked?'is-selected':''}><input type="checkbox" checked={checked} disabled={candidate.score<0 || (!checked && tags.length>=20)} onChange={() => onChange(checked?tags.filter(value=>keyOf(value)!==keyOf(tag)):[...tags,tag])} />{candidate.label}<small>{candidate.score.toFixed(4)}</small></label>;
            })}</div></div>;
        })}</div>}
        <div className="fashion-ai__selected"><h3>선택한 태그 <small>{tags.length}/20</small></h3><div className="fashion-ai__chips">{tags.map(tag=><button type="button" key={keyOf(tag)} onClick={()=>onChange(tags.filter(value=>keyOf(value)!==keyOf(tag)))}>{taxonomy.groups.find(item=>item.key===tag.group)?.label} · {tag.label} ×</button>)}</div>{!tags.length&&<p>선택한 태그가 없습니다.</p>}</div>
        <div className="fashion-ai__custom"><select aria-label="직접 추가할 태그 분류" value={group} onChange={e=>setGroup(e.target.value as TagGroup)}>{taxonomy.groups.map(item=><option key={item.key} value={item.key}>{item.label}</option>)}</select><input aria-label="직접 추가할 태그 이름" list={listId} value={label} onChange={e=>setLabel(e.target.value)} placeholder="목록에서 선택하거나 직접 입력" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}}/><datalist id={listId}>{taxonomy.groups.find(item=>item.key===group)?.labels.map(value=><option key={value} value={value}/>)}</datalist><button type="button" onClick={add}>태그 추가</button></div>
        {error&&<p className="fashion-ai__error" role="alert">{error}</p>}
        <p className="fashion-ai__help">상품 종류·패턴·스타일·짜임을 따로 저장합니다. 숫자는 확률이 아닌 유사도이며, 직접 추가한 태그는 점수 0으로 저장됩니다.</p>
    </fieldset>;
}
