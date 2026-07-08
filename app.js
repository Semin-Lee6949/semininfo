const FALLBACK_POLICIES = [
  {id:'p1',category:'주거',provider:'국토교통부',title:'청년월세 특별지원',description:'월 최대 20만 원, 최대 24개월 동안 월세를 지원합니다.',region:'전국',period:'상시 신청',urgent:true,url:'https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch'},
  {id:'p2',category:'금융',provider:'금융위원회',title:'청년도약계좌',description:'매월 자유롭게 납입하고 정부기여금과 비과세 혜택을 받는 자산형성 상품입니다.',region:'전국',period:'월별 신청',url:'https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch'},
  {id:'p3',category:'일자리',provider:'고용노동부',title:'청년일자리 도약장려금',description:'취업에 어려움을 겪는 청년의 정규직 채용과 장기근속을 지원합니다.',region:'전국',period:'예산 소진 시',url:'https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch'},
  {id:'p4',category:'교육',provider:'고용노동부',title:'국민내일배움카드',description:'직업능력 개발을 위한 훈련비를 지원받아 원하는 역량을 키울 수 있어요.',region:'전국',period:'상시 신청',url:'https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch'},
  {id:'p5',category:'창업',provider:'중소벤처기업부',title:'청년창업사관학교',description:'유망한 창업 아이템과 혁신 기술을 보유한 청년 창업자를 지원합니다.',region:'전국',period:'공고 확인',url:'https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch'},
  {id:'p6',category:'복지',provider:'보건복지부',title:'청년 마음건강 지원',description:'전문 심리상담을 통해 청년의 마음건강 회복과 일상 복귀를 돕습니다.',region:'지역별',period:'지역별 상이',url:'https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch'},
];
const FALLBACK_CONTENT = [
  {type:'MONEY GUIDE',category:'금융생활',title:'사회초년생이 꼭 알아야 할 돈 관리 5단계',date:'2026. 07. 03'},
  {type:'LIVING GUIDE',category:'주거생활',title:'처음 독립할 때 놓치기 쉬운 주거 체크리스트',date:'2026. 06. 28'},
  {type:'CAREER NOTE',category:'취업정보',title:'요즘 채용 담당자가 보는 자기소개서의 핵심',date:'2026. 06. 20'},
];

const ACCESS_HASH='56632b41c72527c1783c8d3e6abf8494d78289d06264aa39f675dd4685d20145';
async function sha256(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('')}
function unlock(){document.body.classList.remove('locked');document.querySelector('#accessGate').classList.add('unlocked');setTimeout(()=>document.querySelector('#accessGate').remove(),350);sessionStorage.setItem('youth-access','granted')}
if(sessionStorage.getItem('youth-access')==='granted')unlock();
document.querySelector('#gateForm')?.addEventListener('submit',async event=>{event.preventDefault();const card=event.currentTarget;const input=document.querySelector('#gatePassword');const error=document.querySelector('#gateError');if(await sha256(input.value)===ACCESS_HASH){unlock();return}error.textContent='비밀번호가 올바르지 않습니다.';input.value='';input.focus();card.classList.remove('shake');void card.offsetWidth;card.classList.add('shake')});

const state={policies:[...FALLBACK_POLICIES],contents:[...FALLBACK_CONTENT],category:'전체',query:'',sort:'recommended',visible:6,saved:new Set(JSON.parse(localStorage.getItem('savedPolicies')||'[]'))};
const $=s=>document.querySelector(s);
const clean=v=>String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const pick=(obj,keys,fallback='')=>{for(const key of keys)if(obj?.[key]!=null&&obj[key]!=='')return obj[key];return fallback};
const deepItems=data=>{const candidates=[data?.result?.data,data?.result?.youthPolicyList,data?.result?.contentList,data?.data?.list,data?.data,data?.items,data?.youthPolicyList,data?.contentList];return candidates.find(Array.isArray)||[]};

function normalizePolicy(p,i){
  const title=clean(pick(p,['plcyNm','polyBizSjnm','policyName','title','bizNm'],'이름 없는 정책'));
  const rawCategory=clean(pick(p,['lclsfNm','policyType','bizTycdNm','plcyMajorCdNm','category'],'기타'));
  const categories=['일자리','주거','교육','복지','금융','창업'];
  const category=categories.find(c=>rawCategory.includes(c))||({'취업':'일자리','생활':'복지·문화'}[rawCategory]||'복지');
  const zipCodes=clean(pick(p,['zipCd'],'')).split(',').filter(Boolean);
  const region=clean(pick(p,['zipCdNm','ctpvNm','region'],zipCodes.length?(zipCodes.every(code=>code.startsWith('11'))?'서울':zipCodes.some(code=>code.startsWith('11'))?'전국':'지역 한정'):'전국'));
  return {id:String(pick(p,['plcyNo','bizId','policyId','id'],`api-${i}`)),category,provider:clean(pick(p,['sprvsnInstCdNm','operInstCdNm','cnsgNmor','provider','orgName'],'온통청년')),title,description:clean(pick(p,['plcyExplnCn','polyItcnCn','description','plcySprtCn'],'자세한 지원 내용은 정책 안내에서 확인해 주세요.')),region,period:clean(pick(p,['aplyYmd','rqutPrdCn','period'],'공고 확인')),url:pick(p,['aplyUrlAddr','refUrlAddr1','rqutUrla','url'],'https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch'),minAge:Number(pick(p,['sprtTrgtMinAge'],0)),maxAge:Number(pick(p,['sprtTrgtMaxAge'],99)),zipCodes,providerGroup:clean(pick(p,['pvsnInstGroupCd'],'')),keywords:clean(pick(p,['plcyKywdNm'],'')),qualification:clean(pick(p,['addAplyQlfcCndCn'],'')),registeredAt:clean(pick(p,['frstRegDt'],'')),views:Number(pick(p,['inqCnt'],0))};
}
function normalizeContent(c,i){return {type:'YOUTH CONTENT',category:clean(pick(c,['pstSeNm','contentTypeName','category'],'청년생활')),title:clean(pick(c,['pstTtl','contentTitle','title','sj'],`청년 콘텐츠 ${i+1}`)),date:clean(pick(c,['frstRegDt','regDate','date'],'')),url:pick(c,['urlAddr','linkUrl','url'],'https://www.youthcenter.go.kr/youthNews/ythTips/ythTipsList')}}

async function requestApi(type,key){
  const response=await fetch(`data/${type}.json`,{headers:{Accept:'application/json'},cache:'no-cache'});if(!response.ok)throw new Error(`DATA ${response.status}`);return response.json();
}
async function loadData(){
  setStatus('온통청년 최신 데이터를 불러오고 있어요.');
  const [p,c]=await Promise.allSettled([requestApi('policy'),requestApi('content')]);
  if(p.status==='fulfilled'){
    const items=deepItems(p.value);const usable=items.filter(item=>clean(pick(item,['plcyNm','polyBizSjnm','policyName','title','bizNm'])));
    const total=Number(p.value?.result?.pagging?.totCount||usable.length);if(total)$('#policyTotal').textContent=total.toLocaleString();
    if(usable.length)state.policies=usable.map(normalizePolicy);
  }
  if(c.status==='fulfilled'){const items=deepItems(c.value);const usable=items.filter(item=>clean(pick(item,['pstTtl','contentTitle','title','sj'])));if(usable.length)state.contents=usable.slice(0,3).map(normalizeContent)}
  const failed=[p,c].filter(x=>x.status==='rejected').length;setStatus(failed?`일부 실시간 데이터를 불러오지 못해 안전한 미리보기로 표시합니다.`:'온통청년 최신 데이터로 업데이트했습니다.',failed?'warn':'ok');render();
}
function setStatus(message,type='warn'){const el=$('#statusMessage');el.innerHTML=`<span></span>${message}`;el.className=`status-message show ${type}`}
function deadlineValue(policy){const matches=String(policy.period||'').match(/\d{8}/g);if(!matches?.length)return Number.MAX_SAFE_INTEGER;const raw=matches.at(-1);return new Date(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T23:59:59+09:00`).getTime()}
function isSeoulEligible(policy){
  if(policy.zipCodes?.some(code=>code.startsWith('11')))return true;
  if(!policy.zipCodes?.length&&policy.providerGroup==='0054001')return true;
  return /서울|전국/.test(`${policy.title} ${policy.description} ${policy.qualification} ${policy.provider}`);
}
function isSeminMatch(policy){const ageOk=29>=(policy.minAge??0)&&29<=(policy.maxAge||99);const deadline=deadlineValue(policy);const open=deadline===Number.MAX_SAFE_INTEGER||deadline>=Date.now();return ageOk&&isSeoulEligible(policy)&&open}
function seminScore(policy){const text=`${policy.title} ${policy.description} ${policy.keywords} ${policy.qualification}`;let score=0;if(/월세|주거|주택|임대|전세|보증금|이사비|중개보수|청약|1인가구|자취/.test(text))score+=100;if(policy.region==='서울')score+=35;if(/서울/.test(text))score+=20;if(policy.category==='금융'||policy.category==='복지')score+=8;score+=Math.min(policy.views||0,5000)/1000;return score}
function filtered(){
  const q=state.query.toLowerCase();let items=state.policies.filter(p=>(state.category==='전체'||p.category.includes(state.category))&&(!q||`${p.title} ${p.description} ${p.provider} ${p.category}`.toLowerCase().includes(q)));
  if(state.sort==='semin')items=items.filter(isSeminMatch).sort((a,b)=>seminScore(b)-seminScore(a)||deadlineValue(a)-deadlineValue(b));
  else if(state.sort==='deadline')items.sort((a,b)=>deadlineValue(a)-deadlineValue(b));
  else if(state.sort==='latest')items.sort((a,b)=>String(b.registeredAt||'').localeCompare(String(a.registeredAt||'')));
  else items.sort((a,b)=>(b.views||0)-(a.views||0));
  return items;
}
function renderPolicies(){
  const items=filtered();$('#personalizedNote').hidden=state.sort!=='semin';$('#resultLabel').textContent=state.sort==='semin'?`맞춤 정책 ${items.length}개`:state.query?`검색 결과 ${items.length}개`:state.category==='전체'?'전체 정책':`${state.category} 정책`;
  $('#policyGrid').innerHTML=items.slice(0,state.visible).map(p=>`<article class="policy-card"><div class="card-top"><span class="tag ${p.urgent?'urgent':''}">${p.urgent?'마감임박':escapeHtml(p.category)}</span><span class="provider">${escapeHtml(p.provider)}</span><button class="save ${state.saved.has(p.id)?'saved':''}" data-save="${escapeHtml(p.id)}" type="button" aria-label="${escapeHtml(p.title)} 저장">${state.saved.has(p.id)?'♥':'♡'}</button></div><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.description)}</p><div class="card-meta"><span>지원 지역<b>${escapeHtml(p.region)}</b></span><span>신청 기간<b>${escapeHtml(p.period)}</b></span></div><a class="card-link" href="${safeUrl(p.url)}" target="_blank" rel="noopener">자세히 보기 <span>→</span></a></article>`).join('')||'<div class="empty-state">조건에 맞는 정책이 없어요.<br>검색어나 분야를 바꿔보세요.</div>';
  $('#moreButton').style.display=items.length>state.visible?'block':'none';updateSavedCount();
}
function renderContents(){$('#contentGrid').innerHTML=state.contents.slice(0,3).map(c=>`<a class="content-card" href="${safeUrl(c.url||'https://www.youthcenter.go.kr')}" target="_blank" rel="noopener"><div class="content-thumb"><span>${escapeHtml(c.type)}</span><b>${escapeHtml(c.category)}<br>실전 가이드</b></div><div class="content-body"><small>${escapeHtml(c.category)}</small><h3>${escapeHtml(c.title)}</h3><span>${escapeHtml(c.date)}</span></div></a>`).join('')}
function render(){renderPolicies();renderContents()}
function escapeHtml(v){return clean(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function safeUrl(v){try{const u=new URL(v,location.href);return ['http:','https:'].includes(u.protocol)?u.href:'#'}catch{return '#'}}
function updateSavedCount(){$('#savedCount').textContent=state.saved.size;localStorage.setItem('savedPolicies',JSON.stringify([...state.saved]))}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1800)}

$('#searchForm').addEventListener('submit',e=>{e.preventDefault();state.query=$('#searchInput').value.trim();state.visible=6;renderPolicies();$('#policies').scrollIntoView({behavior:'smooth'})});
document.querySelectorAll('[data-query]').forEach(b=>b.addEventListener('click',()=>{$('#searchInput').value=b.dataset.query;state.query=b.dataset.query;renderPolicies();$('#policies').scrollIntoView({behavior:'smooth'})}));
$('#categories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;document.querySelectorAll('.category').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.category=b.dataset.category;state.visible=6;renderPolicies();$('#policies').scrollIntoView({behavior:'smooth',block:'start'})});
$('#policyGrid').addEventListener('click',e=>{const b=e.target.closest('[data-save]');if(!b)return;const id=b.dataset.save;if(state.saved.has(id)){state.saved.delete(id);toast('저장에서 삭제했어요.')}else{state.saved.add(id);toast('관심 정책으로 저장했어요.')}renderPolicies()});
$('#moreButton').addEventListener('click',()=>{state.visible+=6;renderPolicies()});
$('#savedButton').addEventListener('click',()=>{toast(state.saved.size?`저장한 정책이 ${state.saved.size}개 있어요.`:'아직 저장한 정책이 없어요.')});
$('#sortSelect').addEventListener('change',event=>{state.sort=event.target.value;state.visible=6;renderPolicies();toast(state.sort==='semin'?'세민님의 조건에 맞는 정책만 모았어요.':'정렬 기준을 적용했어요.')});
$('#clearPersonalized').addEventListener('click',()=>{state.sort='recommended';$('#sortSelect').value='recommended';state.visible=6;renderPolicies()});
$('#menuButton').addEventListener('click',()=>toast('정책 검색과 콘텐츠 메뉴를 준비했어요.'));

render();loadData();
