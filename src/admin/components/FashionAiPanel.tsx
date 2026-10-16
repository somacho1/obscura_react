import { useEffect, useRef, useState } from 'react';
import { analyzeFashion, FALLBACK_TAXONOMY, getFashionTags, getFashionTaxonomy, readFashionImage, saveFashionTags, suggestFashionTags } from '../../api/fashionAiApi';
import type { FashionAnalysis, FashionCategory, FashionTag, FashionTaxonomy } from '../../api/fashionAiApi';
import FashionTagEditor from './FashionTagEditor';
import './FashionAiPanel.css';
interface Props {productNo?:number; imageFile?:File|null; imageUrl?:string; disabled?:boolean; autoAnalyze?:boolean; onChange?:(tags:FashionTag[])=>void; onBlockedChange?:(blocked:boolean)=>void;}
export default function FashionAiPanel({productNo,imageFile,imageUrl,disabled,autoAnalyze=false,onChange,onBlockedChange}:Props) {
    const [taxonomy,setTaxonomy]=useState<FashionTaxonomy>(FALLBACK_TAXONOMY);
    const [taxonomyReady,setTaxonomyReady]=useState(false);
    const [category,setCategory]=useState<FashionCategory>('AUTO');
    const [extras,setExtras]=useState<File[]>([]);
    const [includeMain,setIncludeMain]=useState(true);
    const [automatic,setAutomatic]=useState(autoAnalyze);
    const [analysis,setAnalysis]=useState<FashionAnalysis|null>(null);
    const [tags,setTags]=useState<FashionTag[]>([]);
    const [reviewed,setReviewed]=useState(true);
    const [busy,setBusy]=useState(false);
    const [pending,setPending]=useState(false);
    const [saving,setSaving]=useState(false);
    const [loading,setLoading]=useState(Boolean(productNo));
    const [loadFailed,setLoadFailed]=useState(false);
    const [error,setError]=useState('');
    const [message,setMessage]=useState('');
    const [revision,setRevision]=useState(0);
    const controller=useRef<AbortController|null>(null);
    const version=useRef(0);
    const autoTimer=useRef<number|undefined>(undefined);
    const hasMain=Boolean(imageFile||imageUrl);
    const imageCount=(includeMain&&hasMain?1:0)+extras.length;
    const locked=Boolean(disabled||busy||saving||loading||loadFailed);
    const needsReview=tags.length>0&&!reviewed;

    useEffect(()=>{const abort=new AbortController();getFashionTaxonomy(abort.signal).then(data=>{setTaxonomy(data);setTaxonomyReady(true);setError('');}).catch(err=>{if(!abort.signal.aborted){setTaxonomyReady(false);setError(err instanceof Error?err.message:'AI 분류 조회 실패');}});return()=>abort.abort();},[revision]);
    useEffect(()=>{let active=true;if(!productNo)return;setLoading(true);setLoadFailed(false);getFashionTags(productNo).then(data=>{if(active){setTags(data);setReviewed(true);}}).catch(err=>{if(active){setError(err instanceof Error?err.message:'태그 조회 실패');setLoadFailed(true);}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[productNo,revision]);
    useEffect(()=>{onChange?.(reviewed?tags:[]);},[tags,reviewed,onChange]);
    useEffect(()=>{onBlockedChange?.(busy||pending||needsReview);},[busy,pending,needsReview,onBlockedChange]);
    useEffect(()=>()=>{version.current++;controller.current?.abort();},[]);

    async function analyze() {
        if(disabled||loading||loadFailed||!taxonomyReady)return;
        window.clearTimeout(autoTimer.current);
        const id=++version.current;controller.current?.abort();controller.current=new AbortController();const signal=controller.current.signal;
        setBusy(true);setPending(false);setError('');setMessage('');setAnalysis(null);
        try {
            if(imageCount<1||imageCount>3)throw new Error('대표 이미지와 추가 사진을 합쳐 1~3장을 선택해주세요.');
            const files=[...extras];
            if(includeMain&&hasMain)files.unshift(imageFile||await readFashionImage(imageUrl!,signal));
            if(files.some(file=>file.size>10*1024*1024))throw new Error('이미지는 한 장당 최대 10MB입니다.');
            const result=await analyzeFashion(files,category,signal);
            if(id===version.current){setAnalysis(result);setTags(suggestFashionTags(result));setReviewed(false);setMessage(`${taxonomy.categories.find(item=>item.value===result.category)?.label||result.category} · ${result.imageCount??files.length}장 분석 완료. 선택된 후보를 확인해주세요.`);}
        }catch(err){if(id===version.current&&!signal.aborted)setError(err instanceof Error?err.message:'AI 분석 실패');}
        finally{if(id===version.current)setBusy(false);}
    }
    // 신규 상품은 사진/분류 변경 후 자동으로 후보를 갱신합니다. DB에는 확인 전 저장하지 않습니다.
    useEffect(()=>{
        version.current++;controller.current?.abort();setBusy(false);setPending(false);setAnalysis(null);
        if(!automatic||!taxonomyReady||!imageCount||disabled)return;
        setReviewed(false);setPending(true);const timer=window.setTimeout(()=>void analyze(),700);autoTimer.current=timer;
        return()=>{window.clearTimeout(timer);version.current++;controller.current?.abort();};
        // analyze는 아래 입력값으로만 요청을 구성합니다. 태그 선택 변경으로 재분석하지 않습니다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[automatic,taxonomyReady,imageFile,imageUrl,extras,includeMain,category,disabled]);
    function changeTags(next:FashionTag[]){setTags(next);setReviewed(false);setMessage('');}
    async function save(){if(!productNo||locked||needsReview)return;setSaving(true);setError('');try{setTags(await saveFashionTags(productNo,tags));setReviewed(true);setMessage('선택한 태그를 저장했습니다.');}catch(err){setError(err instanceof Error?err.message:'태그 저장 실패');}finally{setSaving(false);}}
    return <section className="fashion-ai" aria-label="AI 상품 태그"><div className="fashion-ai__heading"><div><span>FASHION AI</span><h2>AI 상품 태그</h2><p>같은 상품의 사진을 최대 3장 분석하고 후보를 확인해 저장하세요.</p></div><small>Marqo FashionSigLIP</small></div>
        <fieldset disabled={locked}><div className="fashion-ai__controls"><label>분석 분류<select aria-label="분석 분류" value={category} onChange={e=>setCategory(e.target.value as FashionCategory)}>{taxonomy.categories.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="fashion-ai__file">추가 사진 · 대표 포함 최대 3장<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value='';if(files.length+(includeMain&&hasMain?1:0)>3){setError('대표 이미지 사용 시 추가 사진은 최대 2장입니다.');return;}setExtras(files);setError('');}}/><small>{extras.length?extras.map(file=>file.name).join(' · '):'추가 사진 없이 대표 이미지로 분석할 수 있습니다.'}</small></label><button type="button" disabled={!taxonomyReady} className="fashion-ai__primary" onClick={()=>void analyze()}>AI 분석</button></div>
        <div className="fashion-ai__switches"><label><input type="checkbox" checked={includeMain} disabled={!hasMain} onChange={e=>{if(e.target.checked&&extras.length>=3){setError('대표 이미지를 포함하려면 추가 사진을 2장 이하로 선택해주세요.');return;}setIncludeMain(e.target.checked);}}/> 대표 이미지 사용{hasMain?'':' · 대표 이미지 미등록'}</label><label><input type="checkbox" checked={automatic} onChange={e=>setAutomatic(e.target.checked)}/> 사진·분류 변경 시 자동 분석</label>{extras.length>0&&<button type="button" onClick={()=>setExtras([])}>추가 사진 비우기</button>}</div></fieldset>
        <p className="fashion-ai__help">상품 사진만 선택해주세요. 사이즈표·설명 이미지나 다른 상품 사진을 섞지 마세요. MEN/WOMEN 분류와 AI 분석 분류는 별개입니다.</p>
        {(busy||pending)&&<p role="status">{pending?'자동 분석을 준비하고 있습니다.':'사진을 분석하고 있습니다. CPU 환경에서는 시간이 걸릴 수 있습니다.'}</p>}{busy&&<button type="button" onClick={()=>{version.current++;controller.current?.abort();setBusy(false);setPending(false);setAutomatic(false);}}>분석 중단</button>}{loading&&<p role="status">저장된 태그를 불러오는 중입니다.</p>}
        {error&&<p className="fashion-ai__error" role="alert">{error}</p>}{(!taxonomyReady||loadFailed)&&<button type="button" disabled={loading} onClick={()=>setRevision(value=>value+1)}>AI 연결·태그 다시 확인</button>}{message&&<p className="fashion-ai__message" role="status">{message}</p>}
        <FashionTagEditor taxonomy={taxonomy} tags={tags} analysis={analysis} onChange={changeTags} disabled={locked}/>
        {tags.length>0&&<label className="fashion-ai__review"><input type="checkbox" checked={reviewed} disabled={locked} onChange={e=>setReviewed(e.target.checked)}/> 선택한 태그를 확인했습니다.</label>}
        {productNo?<button type="button" className="fashion-ai__primary" disabled={locked||needsReview} onClick={()=>void save()}>{saving?'저장 중…':'선택 태그 저장'}</button>:<p className="fashion-ai__help">확인한 태그는 상품 등록 시 저장합니다. 태그 없이 등록하려면 선택 태그를 모두 제거하거나 분석하지 않고 등록하세요.</p>}
    </section>;
}
