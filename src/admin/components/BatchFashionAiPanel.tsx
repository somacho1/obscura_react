import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyzeFashion, FALLBACK_TAXONOMY, FashionApiError, getFashionTagStatus, getFashionTaxonomy, readFashionImage, saveFashionTagsIfEmpty, suggestFashionTags } from '../../api/fashionAiApi';
import type { FashionAnalysis, FashionCategory, FashionTag, FashionTaxonomy } from '../../api/fashionAiApi';
import FashionTagEditor from './FashionTagEditor';
import './FashionAiPanel.css';
interface Product {no:number;name:string;mainImageUrl:string|null;}
type Status='queued'|'running'|'review'|'saved'|'skipped'|'error';
interface Job {product:Product;status:Status;tags:FashionTag[];analysis?:FashionAnalysis;message?:string;}
const STATUS:Record<Status,string>={queued:'대기',running:'분석 중',review:'확인 필요',saved:'저장 완료',skipped:'기존 태그 보호',error:'실패/중단'};
export default function BatchFashionAiPanel({products}:{products:Product[]}) {
    const [taxonomy,setTaxonomy]=useState<FashionTaxonomy>(FALLBACK_TAXONOMY);
    const [ready,setReady]=useState(false);
    const [category,setCategory]=useState<FashionCategory>('AUTO');
    const [jobs,setJobs]=useState<Job[]>([]);
    const [busy,setBusy]=useState(false);
    const [saving,setSaving]=useState(false);
    const [confirmed,setConfirmed]=useState(false);
    const [error,setError]=useState('');
    const [reload,setReload]=useState(0);
    const alive=useRef(true), stop=useRef(false), running=useRef(false);
    const controller=useRef<AbortController|null>(null);
    useEffect(()=>{const abort=new AbortController();getFashionTaxonomy(abort.signal).then(data=>{setTaxonomy(data);setReady(true);setError('');}).catch(err=>{if(!abort.signal.aborted)setError(err instanceof Error?err.message:'분류 조회 실패');});return()=>abort.abort();},[reload]);
    useEffect(()=>{alive.current=true;return()=>{alive.current=false;stop.current=true;controller.current?.abort();};},[]);
    function patch(no:number, update:Partial<Job>){if(alive.current)setJobs(previous=>previous.map(job=>job.product.no===no?{...job,...update}:job));}
    async function run(targets:Product[], fresh:boolean) {
        if(running.current||saving||!targets.length||!ready)return;
        running.current=true;stop.current=false;setBusy(true);setConfirmed(false);setError('');
        if(fresh)setJobs(targets.map(product=>({product,status:'queued',tags:[]})));
        else setJobs(previous=>previous.map(job=>targets.some(product=>product.no===job.product.no)?{...job,status:'queued',message:undefined}:job));
        try {
            for(const product of targets){
                if(stop.current||!alive.current)break;
                controller.current=new AbortController();const signal=controller.current.signal;
                patch(product.no,{status:'running',message:undefined});
                try {
                    const status=await getFashionTagStatus(product.no);
                    if(stop.current||!alive.current)break;
                    if(status.count>0){patch(product.no,{status:'skipped',message:'기존에 저장된 태그를 변경하지 않았습니다.'});continue;}
                    if(!product.mainImageUrl)throw new Error('대표 이미지가 없습니다. 상품 수정 화면에서 등록해주세요.');
                    const file=await readFashionImage(product.mainImageUrl,signal);
                    const result=await analyzeFashion(file,category,signal);
                    if(!stop.current)patch(product.no,{status:'review',analysis:result,tags:suggestFashionTags(result)});
                    else patch(product.no,{status:'error',message:'분석을 중단했습니다. 다시 시도할 수 있습니다.'});
                }catch(err){patch(product.no,{status:'error',message:signal.aborted?'중단했습니다.':err instanceof Error?err.message:'분석 실패'});}
            }
        }finally{running.current=false;if(alive.current){setBusy(false);setJobs(previous=>previous.map(job=>job.status==='running'?{...job,status:'error',message:'중단했습니다.'}:job));}}
    }
    async function save(targets:Job[]) {
        if(busy||saving)return;setSaving(true);setError('');
        try{for(const job of targets){if(!alive.current)break;try{await saveFashionTagsIfEmpty(job.product.no,job.tags);patch(job.product.no,{status:'saved',message:'확인한 태그를 저장했습니다.'});}catch(err){patch(job.product.no,{status:err instanceof FashionApiError&&err.status===409?'skipped':'review',message:err instanceof Error?err.message:'태그 저장 실패'});}}}
        finally{if(alive.current)setSaving(false);}
    }
    const complete=jobs.filter(job=>!['queued','running'].includes(job.status)).length;
    const reviews=jobs.filter(job=>job.status==='review'&&job.tags.length>0);
    return <section className="fashion-ai fashion-ai--batch" aria-label="상품 일괄 AI 분석"><div className="fashion-ai__heading"><div><span>BATCH ANALYSIS</span><h2>선택 상품 AI 분석</h2><p>대표 이미지 한 장씩 순서대로 분석합니다. 기존 태그가 있는 상품은 건너뜁니다.</p></div><small>선택 {products.length}개</small></div>
        <div className="fashion-ai__controls"><label>일괄 분석 분류<select aria-label="일괄 분석 분류" value={category} disabled={busy||saving} onChange={e=>setCategory(e.target.value as FashionCategory)}>{taxonomy.categories.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button type="button" className="fashion-ai__primary" disabled={busy||saving||!ready||!products.length} onClick={()=>void run(products,true)}>선택 상품 분석</button><button type="button" disabled={!busy} onClick={()=>{stop.current=true;controller.current?.abort();}}>분석 중단</button><button type="button" disabled={busy||saving||!ready||!jobs.some(job=>job.status==='error'||job.status==='queued')} onClick={()=>void run(jobs.filter(job=>job.status==='error'||job.status==='queued').map(job=>job.product),false)}>실패·대기 재시도</button></div>
        {error&&<p className="fashion-ai__error" role="alert">{error}</p>}{!ready&&<button type="button" onClick={()=>setReload(value=>value+1)}>AI 서버 다시 연결</button>}
        {jobs.length>0&&<><p role="status">전체 {jobs.length}개 중 {complete}개 처리 · 확인 필요 {jobs.filter(job=>job.status==='review').length}개 · 저장 {jobs.filter(job=>job.status==='saved').length}개</p><progress aria-label="일괄 분석 진행률" value={complete} max={jobs.length}/><div className="fashion-ai__batch-results">{jobs.map(job=><details key={job.product.no} className="fashion-ai__batch-job"><summary><strong>#{job.product.no} {job.product.name}</strong><span>{STATUS[job.status]}</span></summary>{job.message&&<p>{job.message}</p>}{job.status==='review'&&<><FashionTagEditor taxonomy={taxonomy} tags={job.tags} analysis={job.analysis} disabled={busy||saving} onChange={tags=>{patch(job.product.no,{tags,message:undefined});setConfirmed(false);}}/><button type="button" disabled={busy||saving||!job.tags.length} className="fashion-ai__primary" onClick={()=>void save([job])}>이 상품 태그 확인·저장</button></>}<Link to={`/admin/products/${job.product.no}/edit`}>상품 수정에서 상세 확인</Link></details>)}</div><label className="fashion-ai__review"><input type="checkbox" checked={confirmed} disabled={busy||saving} onChange={e=>setConfirmed(e.target.checked)}/> 저장할 후보를 확인했습니다.</label><button type="button" className="fashion-ai__primary" disabled={busy||saving||!confirmed||!reviews.length} onClick={()=>void save(reviews)}>{saving?'저장 중…':`확인 필요 ${reviews.length}개 태그 저장`}</button></>}
        <p className="fashion-ai__help">분석만으로 DB에 저장하지 않습니다. 후보 확인 후 저장하세요. 작업 중에는 이 화면을 유지해주세요. 화면을 벗어나면 저장하지 않은 분석 후보는 사라집니다.</p>
    </section>;
}
