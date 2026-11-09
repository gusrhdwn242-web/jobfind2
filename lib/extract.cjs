'use strict';
const ALLOWED=['saramin.co.kr','jobkorea.co.kr','cafe.naver.com','m.cafe.naver.com','wanted.co.kr','work24.go.kr','greenhouse.io','lever.co','jobs.lever.co','ashbyhq.com'];
function urlCheck(raw){
 let u;try{u=new URL(String(raw||''))}catch{throw new Error('올바른 공고 URL을 입력해 주세요.')}
 if(u.protocol!=='https:'||u.port||u.username||u.password)throw new Error('https:// 링크만 지원해요.');
 const host=u.hostname.toLowerCase();
 if(!ALLOWED.some(a=>host===a||(!a.includes('cafe.naver.com')&&host.endsWith('.'+a))))throw new Error('현재 자동 분석은 사람인·잡코리아·네이버 카페·원티드·고용24 등 지원 사이트의 공개 공고만 가능해요. 기타 사이트는 링크만 저장해 주세요.');
 return u.href;
}
function decode(s){return String(s||'').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&(?:middot|bull);/gi,'·').replace(/&(?:rarr|rightarrow);/gi,'→').replace(/&#x([0-9a-f]+);/gi,(_,n)=>{const x=parseInt(n,16);return x>0&&x<=0x10ffff?String.fromCodePoint(x):''}).replace(/&#(\d+);/g,(_,n)=>{const x=+n;return x>0&&x<=0x10ffff?String.fromCodePoint(x):''});}
function textClean(s){return String(s||'').replace(/\u00a0/g,' ').replace(/\r/g,'').split('\n').map(x=>x.replace(/[ \t]+/g,' ').trim()).filter(Boolean).join('\n').slice(0,100000)}
function htmlText(html){
 let s=String(html||'');s=s.replace(/<(script|style|noscript|svg|iframe|header|footer|nav)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ');
 s=s.replace(/<!--[^]*?-->/g,' ');
 s=s.replace(/<(?:br|hr)\b[^>]*\/?>/gi,'\n').replace(/<\/(?:p|div|li|section|article|h[1-6]|td|tr|dt|dd|ul|ol|main|dl)>/gi,'\n').replace(/<(?:li|h[1-6])\b[^>]*>/gi,'\n');
 return textClean(decode(s.replace(/<[^>]*>/g,' ')));
}
function meta(html,key){for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const a=tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i);if(a?.[1]?.toLowerCase()!==key.toLowerCase())continue;const b=tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);return decode(b?.[1]||'')}return ''}
function ldJob(html){for(const tag of html.match(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)||[]){try{const payload=tag.replace(/^<script[^>]*>/i,'').replace(/<\/script>$/i,'');const objs=[JSON.parse(payload)];let count=0;while(objs.length&&count++<150){const item=objs.pop();if(Array.isArray(item)){objs.push(...item);continue}if(!item||typeof item!=='object')continue;const kinds=Array.isArray(item['@type'])?item['@type']:[item['@type']];if(kinds.some(t=>String(t).toLowerCase().endsWith('jobposting')))return item;for(const [k,v] of Object.entries(item)){if(v&&typeof v==='object')objs.push(v)}}}catch{}}return null}
const labels={responsibilities:/^(?:담당\s*업무|주요\s*업무|수행\s*업무|직무\s*내용|담당하실\s*업무|하는\s*일|주요\s*역할|합류하면\s*하게\s*될\s*일|what\s+you(?:'ll|\s+will)\s+do)\s*[:：]?/i,requirements:/^(?:자격\s*요건|필수\s*요건|필요\s*요건|필수\s*사항|지원\s*자격|지원\s*조건|이런\s*분을\s*찾아요|qualifications?|requirements?)\s*[:：]?/i,preferred:/^(?:우대\s*사항|우대\s*조건|우대\s*요건|preferred|nice\s+to\s+have)\s*[:：]?/i,process:/^(?:전형\s*절차|채용\s*절차|채용\s*과정|채용\s*프로세스|interview\s+process)\s*[:：]?/i};
const endHeader=/^(?:근무\s*조건|접수\s*기간|접수\s*방법|기업\s*정보|지원\s*방법|복리\s*후생|채용\s*공고|마감\s*일|공고\s*마감|입사\s*지원|근무\s*지역|연봉|급여|유의\s*사항|지원\s*자격|자격\s*요건|담당\s*업무|우대\s*사항|전형\s*절차|홈페이지|문의처)/i;
function sections(text){const a={responsibilities:[],requirements:[],preferred:[],process:[]};let current=null;for(const original of text.split('\n')){const line=original.trim();if(!line)continue;const entry=Object.entries(labels).find(([,rx])=>rx.test(line)&&line.length<=115);if(entry){current=entry[0];const rem=line.replace(entry[1],'').replace(/^[\s\]\[·:\-：]+/,'').trim();if(rem)a[current].push(rem);continue;}if(endHeader.test(line)&&line.length<85){current=null;continue}if(current&&a[current].length<22&&line.length<=450){a[current].push(line)}}for(const k in a){a[k]=a[k].join('\n').slice(0,k==='process'?600:2500)}return a}
function date(s){const m=String(s||'').match(/(20\d{2})[.\/\-년\s]+(0?[1-9]|1[0-2])[.\/\-월\s]+(3[01]|[12]\d|0?[1-9])/);if(!m)return '';const y=+m[1],month=+m[2],d=+m[3],obj=new Date(Date.UTC(y,month-1,d));return obj.getUTCMonth()+1===month&&obj.getUTCDate()===d?`${y}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`:''}
function source(url){const u=new URL(url).hostname;if(u.includes('jobkorea'))return '잡코리아';if(u.includes('saramin'))return '사람인';if(u.includes('naver'))return '네이버 카페';if(u.includes('wanted'))return '원티드';if(u.includes('work24'))return '고용24';return '기업 채용홈페이지'}
function parsePage(html,url){
 const txt=htmlText(html);const ld=ldJob(html);const heading=decode((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||'').replace(/<[^>]+>/g,' ').trim();
 const rawTitle=String(ld?.title||meta(html,'og:title')||meta(html,'twitter:title')||heading||decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||''));
 let title=rawTitle.replace(/\s*[-|｜]\s*(?:사람인|잡코리아|JOBKOREA|네이버 카페|원티드|Wanted).*$/i,'').trim().slice(0,180);
 const company=String(ld?.hiringOrganization?.name|| (txt.match(/(?:회사명|기업명|고용기업)\s*[:：]\s*([^\n]{2,70})/)||[])[1]||meta(html,'og:site_name')||'').replace(/^(?:사람인|잡코리아|네이버 카페|원티드)$/,'').slice(0,90);
 let s=sections(txt);const ldDescription=ld?.description?htmlText(String(ld.description)):'';const extra=ldDescription?sections(ldDescription):{};
 for(const field of ['responsibilities','requirements','preferred','process'])if(!s[field])s[field]=extra[field]||'';
 for(const [field,name] of [['responsibilities','responsibilities'],['requirements','qualifications']])if(!s[field]&&ld?.[name])s[field]=htmlText(String(ld[name])).slice(0,2500);
 const evidence=(s.responsibilities.length>15?1:0)+(s.requirements.length>15?1:0)+(ld?1:0);
 const blocked=/접근이\s*제한|권한이\s*없|자동입력방지|비정상적인\s*접근|captcha|access denied/i.test(txt.slice(0,2000));
 if(blocked&&evidence===0)throw new Error('이 사이트에서 자동 조회를 차단하고 있어요. 링크만 저장하거나 원문을 붙여넣어 주세요.');
 // Avoid pretending a generic company portal page is a completed job extraction.
 if((!title||title.length<4||/^(?:사람인|잡코리아|네이버 카페|로그인|채용공고\s*검색|채용정보)$/i.test(title))&&evidence===0)throw new Error('원본에서 채용공고 내용을 확인하지 못했어요.');
 const deadlineLines=txt.split('\n').filter(x=>/마감|접수\s*기간|지원\s*기간|채용\s*기간|모집\s*기간|접수\s*종료/i.test(x)).slice(0,18).join('\n');
 let deadline='',deadlineType='unknown';
 if(ld?.validThrough){deadline=date(ld.validThrough);if(deadline)deadlineType='date'}
 if(deadlineType==='unknown'&&/상시\s*채용|채용\s*시\s*마감|상시\s*모집/i.test(deadlineLines||txt.slice(0,3000)))deadlineType='always';
 if(deadlineType==='unknown'){
  // Deadline labels can contain a date range; choose the last one in the labeled span.
  const dates=[...(deadlineLines||'').matchAll(/20\d{2}[.\-/년\s]+(?:0?[1-9]|1[0-2])[.\-/월\s]+(?:0?[1-9]|[12]\d|3[01])/g)].map(x=>date(x[0])).filter(Boolean);
  if(dates.length){deadline=dates[dates.length-1];deadlineType='date'}
 }
 const evidenceText=[txt.slice(0,9000),ldDescription].join('\n');
 let exp='미기재';if(/신입\s*(?:\/|및|·|,|또는)\s*경력|신입\s*경력/i.test(evidenceText))exp='신입·경력';else if(/경력\s*무관/i.test(evidenceText))exp='경력무관';else if(/신입/i.test(evidenceText))exp='신입';else if(/인턴/i.test(evidenceText))exp='인턴';else if(/경력\s*\d+\s*년/i.test(evidenceText))exp='경력';
 const region=(evidenceText.match(/(?:근무\s*지역|근무처|근무\s*장소)\s*[:：]?\s*(서울|경기|인천|부산|대전|대구|광주|울산|세종|제주|강원|충북|충남|전북|전남|경북|경남)/)||[])[1]||'';
 const employment=/인턴/.test(evidenceText)?'인턴':/계약직/.test(evidenceText)?'계약직':/정규직/.test(evidenceText)?'정규직':'기타';
 const warnings=[];
 if(!s.responsibilities)warnings.push('담당 업무');if(!s.requirements)warnings.push('자격 요건');if(deadlineType==='unknown')warnings.push('마감일');
 if(!title||title.length<4)title='';
 return {job:{url,company,title,source:source(url),category:'',region,experience:exp,employment,deadlineType,deadline,postedAt:'',...s},warning:warnings.length?'일부 항목('+warnings.join('·')+')은 원본에서 확인하지 못했어요. 저장 전에 반드시 확인해 주세요.':'공고 정보를 자동으로 읽었어요. 저장 전에 원본과 대조해 주세요.',partial:warnings.length>0};
}
async function fetchAndParse(raw,fetcher=fetch){
 const url=urlCheck(raw);
 let res;try{res=await fetcher(url,{method:'GET',headers:{'User-Agent':'Mozilla/5.0 (compatible; JOBZIP/1.0; public job posting organizer)','Accept':'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5','Accept-Language':'ko-KR,ko;q=0.9'},redirect:'manual',signal:AbortSignal.timeout(9500)})}catch{throw new Error('원본 사이트에 연결하지 못했어요. 네트워크 또는 사이트 접근 제한일 수 있어요.')}
 if(res.status>=300&&res.status<400){const location=res.headers.get('location')||'';throw new Error(location.includes('login')?'로그인해야 볼 수 있는 공고예요. 원문 붙여넣기를 이용해 주세요.':'원본 페이지가 다른 주소로 이동했어요. 이동 후의 공고 주소를 복사해 시도해 주세요.')}
 if([401,403,429].includes(res.status))throw new Error(`원본 사이트에서 서버 접근을 제한했어요 (HTTP ${res.status}). 링크만 저장하거나 원문을 붙여넣어 주세요.`);
 if(!res.ok)throw new Error(`원본 페이지 조회 실패 (HTTP ${res.status}). 링크와 공개 여부를 확인해 주세요.`);
 const type=res.headers.get('content-type')||'';if(!/html|text\/plain/i.test(type))throw new Error('원본이 텍스트 페이지가 아니라서 자동 분석이 어려워요.');
 if(Number(res.headers.get('content-length')||0)>1500000)throw new Error('원본 페이지 용량이 너무 커서 자동 분석할 수 없어요.');
 let html='';try{html=(await res.text()).slice(0,1500000)}catch{throw new Error('공고 내용을 읽는 중 연결이 끊겼어요.')}
 return parsePage(html,url);
}
module.exports={urlCheck,parsePage,fetchAndParse};
