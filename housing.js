const FALLBACK_HOUSING=[
  {id:'h1',area:'서울',type:'공공분양',name:'서울 공공주택 청년 특별공급',summary:'청년과 생애최초 대상자를 위한 공공분양 특별공급 공고입니다.',recruitDate:'2026-07-01',applyStart:'2026-07-15',applyEnd:'2026-07-18',households:'128세대',tags:['청년우대','생애최초','공공분양'],url:'https://www.applyhome.co.kr'},
  {id:'h2',area:'경기',type:'민영주택',name:'수도권 민영주택 일반공급',summary:'수도권 민영주택 청약 접수 일정과 공급 규모를 확인하세요.',recruitDate:'2026-07-03',applyStart:'2026-07-20',applyEnd:'2026-07-22',households:'412세대',tags:['민영주택'],url:'https://www.applyhome.co.kr'},
  {id:'h3',area:'인천',type:'임대',name:'청년 매입임대 예비입주자 모집',summary:'무주택 청년을 대상으로 하는 임대주택 예비입주자 모집 공고입니다.',recruitDate:'2026-06-28',applyStart:'2026-07-10',applyEnd:'2026-07-24',households:'90호',tags:['청년우대','임대'],url:'https://www.applyhome.co.kr'},
  {id:'h4',area:'부산',type:'공공분양',name:'생애최초 특별공급 주택청약',summary:'무주택 실수요자를 위한 생애최초 특별공급 일정입니다.',recruitDate:'2026-07-05',applyStart:'2026-07-23',applyEnd:'2026-07-25',households:'76세대',tags:['생애최초','공공분양'],url:'https://www.applyhome.co.kr'},
  {id:'h5',area:'대전',type:'민영주택',name:'신혼부부 특별공급 아파트',summary:'신혼부부 특별공급 물량이 포함된 민영주택 청약 공고입니다.',recruitDate:'2026-07-07',applyStart:'2026-07-28',applyEnd:'2026-07-30',households:'204세대',tags:['신혼부부','민영주택'],url:'https://www.applyhome.co.kr'},
  {id:'h6',area:'전국',type:'임대',name:'청년 전세임대 입주자 모집',summary:'전국 단위 청년 전세임대 입주자를 모집합니다.',recruitDate:'2026-06-25',applyStart:'2026-07-08',applyEnd:'2026-08-02',households:'1,000호',tags:['청년우대','임대'],url:'https://www.applyhome.co.kr'}
];

const ACCESS_HASH='56632b41c72527c1783c8d3e6abf8494d78289d06264aa39f675dd4685d20145';
async function sha256(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('')}
function unlock(){document.body.classList.remove('locked');document.querySelector('#accessGate')?.classList.add('unlocked');setTimeout(()=>document.querySelector('#accessGate')?.remove(),350);sessionStorage.setItem('youth-access','granted')}
if(sessionStorage.getItem('youth-access')==='granted')unlock();
document.querySelector('#gateForm')?.addEventListener('submit',async event=>{event.preventDefault();const card=event.currentTarget;const input=document.querySelector('#gatePassword');const error=document.querySelector('#gateError');if(await sha256(input.value)===ACCESS_HASH){unlock();return}error.textContent='비밀번호가 올바르지 않습니다.';input.value='';input.focus();card.classList.remove('shake');void card.offsetWidth;card.classList.add('shake')});

const state={items:[...FALLBACK_HOUSING],filters:new Set(['전체']),query:'',sort:'deadline',visible:6};
const $=selector=>document.querySelector(selector);
const clean=value=>String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const pick=(obj,keys,fallback='')=>{for(const key of keys)if(obj?.[key]!=null&&obj[key]!=='')return obj[key];return fallback};
const deepItems=data=>{const candidates=[data?.data,data?.items,data?.response?.body?.items?.item,data?.response?.body?.items,data?.result?.data,data?.list];return candidates.find(Array.isArray)||[]};

function normalizeDate(value){
  const raw=clean(value);
  const match=raw.match(/(\d{4})[.-]?(\d{2})[.-]?(\d{2})/);
  return match?`${match[1]}-${match[2]}-${match[3]}`:raw;
}
function normalizedDates(item,keys){
  return keys.map(key=>normalizeDate(item?.[key])).filter(Boolean);
}
function minDate(item,keys){
  const dates=normalizedDates(item,keys).sort();
  return dates[0]||'';
}
function maxDate(item,keys){
  const dates=normalizedDates(item,keys).sort();
  return dates.at(-1)||'';
}
function todayKst(){const now=new Date();return new Date(now.toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'})).getTime()}
function inferTags(item,text){
  const tags=new Set(Array.isArray(item.tags)?item.tags:[]);
  if(/청년|청년우대|청년 특별|청년특별/.test(text))tags.add('청년우대');
  if(/생애최초/.test(text))tags.add('생애최초');
  if(/신혼부부|신혼/.test(text))tags.add('신혼부부');
  if(/공공분양|국민주택|공공주택/.test(text))tags.add('공공분양');
  if(/민영|민간/.test(text))tags.add('민영주택');
  if(/임대|전세임대|매입임대|공공임대/.test(text))tags.add('임대');
  return [...tags];
}
function normalizeHousing(item,index){
  const name=clean(pick(item,['주택명','HOUSE_NM','houseNm','hsmpNm','pblancNm','SUPLY_NM','name','title'],'주택청약 공고'));
  const area=clean(pick(item,['공급지역명','SUBSCRPT_AREA_CODE_NM','sido','area','region','HSSPLY_ADRES'],'전국')).split(' ')[0]||'전국';
  const type=clean(pick(item,['분양구분코드명','주택구분코드명','주택상세구분코드명','HOUSE_SECD_NM','suplyTy','type','SPSPLY_SECD_NM'],'주택청약'));
  const location=clean(pick(item,['공급위치','HSSPLY_ADRES'],''));
  const company=clean(pick(item,['건설업체명_시공사','사업주체명_시행사','BSNS_MBY_NM'],''));
  const summary=clean(pick(item,['summary','description'],location||company||'공급 위치와 신청 조건은 원문 공고에서 확인해 주세요.'));
  const recruitDate=normalizeDate(pick(item,['모집공고일','RCRIT_PBLANC_DE','pblancDate','recruitDate','PBLANC_DE']));
  const applyStart=minDate(item,['청약접수시작일','특별공급접수시작일','해당지역1순위접수시작일','해당지역2순위접수시작일','기타지역1순위접수시작일','기타지역2순위접수시작일','SUBSCRPT_RCEPT_BGNDE','RCEPT_BGNDE','applyStart','SPSPLY_RCEPT_BGNDE']);
  const applyEnd=maxDate(item,['청약접수종료일','특별공급접수종료일','해당지역1순위접수종료일','해당지역2순위접수종료일','기타지역1순위접수종료일','기타지역2순위접수종료일','SUBSCRPT_RCEPT_ENDDE','RCEPT_ENDDE','applyEnd','SPSPLY_RCEPT_ENDDE']);
  const households=clean(pick(item,['공급규모','TOT_SUPLY_HSHLDCO','SUPLY_HSHLDCO','households','supplyCount'],'공고 확인'));
  const text=`${name} ${area} ${type} ${summary} ${clean(JSON.stringify(item))}`;
  return {id:String(pick(item,['주택관리번호','공고번호','id','PBLANC_NO','pblancNo','HOUSE_MANAGE_NO'],`housing-${index}`)),area,type,name,summary,recruitDate,applyStart,applyEnd,households,tags:inferTags(item,text),url:pick(item,['모집공고홈페이지주소','홈페이지주소','url','PBLANC_URL','DETAIL_URL'],'https://www.applyhome.co.kr')};
}
function dateValue(value){const time=Date.parse(`${value}T23:59:59+09:00`);return Number.isFinite(time)?time:Number.MAX_SAFE_INTEGER}
function isOpenOrUpcoming(item){return dateValue(item.applyEnd)>=todayKst()}
function youthScore(item){let score=0;if(item.tags.includes('청년우대'))score+=100;if(item.tags.includes('생애최초'))score+=35;if(item.tags.includes('공공분양')||item.tags.includes('임대'))score+=20;if(/서울|경기|인천|수도권/.test(`${item.area} ${item.name}`))score+=10;return score}
function filtered(){
  const q=state.query.toLowerCase();
  let items=state.items.filter(item=>{
    const text=`${item.name} ${item.area} ${item.type} ${item.summary} ${item.tags.join(' ')}`.toLowerCase();
    const filterOk=state.filters.has('전체')||[...state.filters].every(filter=>item.tags.includes(filter)||item.type.includes(filter));
    return isOpenOrUpcoming(item)&&filterOk&&(!q||text.includes(q));
  });
  if(state.sort==='latest')items.sort((a,b)=>String(b.recruitDate).localeCompare(String(a.recruitDate)));
  else if(state.sort==='youth')items.sort((a,b)=>youthScore(b)-youthScore(a)||dateValue(a.applyEnd)-dateValue(b.applyEnd));
  else items.sort((a,b)=>dateValue(a.applyEnd)-dateValue(b.applyEnd));
  return items;
}
function escapeHtml(value){return clean(value).replace(/[&<>'"]/g,match=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[match]))}
function safeUrl(value){try{const url=new URL(value,location.href);return ['http:','https:'].includes(url.protocol)?url.href:'#'}catch{return '#'}}
function setStatus(message,type='warn'){const el=$('#housingStatus');el.innerHTML=`<span></span>${message}`;el.className=`status-message show ${type}`}
function render(){
  const items=filtered();
  $('#housingTotal').textContent=state.items.length.toLocaleString();
  $('#openTotal').textContent=state.items.filter(isOpenOrUpcoming).length.toLocaleString();
  $('#housingResultLabel').textContent=state.filters.has('전체')?(state.query?`검색 결과 ${items.length}개`:'전체 공고'):`필터 결과 ${items.length}개`;
  $('#housingGrid').innerHTML=items.slice(0,state.visible).map(item=>`<article class="housing-card"><div class="housing-card-top"><span class="housing-tag primary">${escapeHtml(item.type)}</span><span class="housing-tag">${escapeHtml(item.tags[0]||'공고')}</span><span class="housing-area">${escapeHtml(item.area)}</span></div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.summary)}</p><div class="housing-card-meta"><span>접수 기간<b>${escapeHtml(item.applyStart||'공고 확인')} ~ ${escapeHtml(item.applyEnd||'공고 확인')}</b></span><span>공급 규모<b>${escapeHtml(item.households)}</b></span></div><a class="housing-card-link" href="${safeUrl(item.url)}" target="_blank" rel="noopener">원문 보기 <span>→</span></a></article>`).join('')||'<div class="empty-state">조건에 맞는 청약 공고가 없어요.<br>검색어나 필터를 바꿔보세요.</div>';
  $('#housingMore').style.display=items.length>state.visible?'block':'none';
}
function applyHousingData(data){
  const items=deepItems(data).filter(item=>clean(pick(item,['주택명','HOUSE_NM','houseNm','hsmpNm','pblancNm','SUPLY_NM','name','title'])));
  if(!items.length)throw new Error('usable fields empty');
  state.items=items.map(normalizeHousing);
  const openCount=state.items.filter(isOpenOrUpcoming).length;
  setStatus(`동기화된 주택청약 데이터 ${state.items.length.toLocaleString()}건을 확인했습니다. 현재 접수중·예정 공고는 ${openCount.toLocaleString()}건입니다.`,'ok');
}
async function loadHousing(){
  try{
    const response=await fetch('data/housing.json',{headers:{Accept:'application/json'},cache:'no-cache'});
    if(!response.ok)throw new Error(`DATA ${response.status}`);
    applyHousingData(await response.json());
  }catch(error){
    setStatus('주택청약 동기화 데이터를 불러오지 못해 미리보기 데이터로 표시합니다.','warn');
  }
  render();
}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1800)}

$('#housingSearchForm').addEventListener('submit',event=>{event.preventDefault();state.query=$('#housingSearchInput').value.trim();state.visible=6;render();$('#filterTitle').scrollIntoView({behavior:'smooth',block:'start'})});
$('#housingFilters').addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;const value=button.dataset.filter;if(value==='전체'){state.filters=new Set(['전체']);}else{state.filters.delete('전체');state.filters.has(value)?state.filters.delete(value):state.filters.add(value);if(!state.filters.size)state.filters.add('전체');}document.querySelectorAll('#housingFilters button').forEach(item=>item.classList.toggle('active',state.filters.has(item.dataset.filter)));state.visible=6;render()});
$('#housingSort').addEventListener('change',event=>{state.sort=event.target.value;state.visible=6;render();toast('정렬 기준을 적용했어요.')});
$('#housingMore').addEventListener('click',()=>{state.visible+=6;render()});
$('#menuButton').addEventListener('click',()=>toast('상단 메뉴에서 정책 찾기와 주택청약을 이동할 수 있어요.'));

render();loadHousing();
