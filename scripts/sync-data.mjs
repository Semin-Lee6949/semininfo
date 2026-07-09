import { mkdir, writeFile } from 'node:fs/promises';

const HOUSING_PAGE_SIZE = 1000;

const feeds = {
  policy: { path: '/go/ythip/getPlcy', key: process.env.YOUTH_POLICY_API_KEY },
  content: { path: '/go/ythip/getContent', key: process.env.YOUTH_CONTENT_API_KEY },
  housing: {
    url: process.env.HOUSING_SUBSCRIPTION_API_URL || 'https://api.odcloud.kr/api/15101046/v1/uddi:14a46595-03dd-47d3-a418-d64e52820598',
    key: process.env.HOUSING_SUBSCRIPTION_API_KEY,
    params: { page: '1', perPage: String(HOUSING_PAGE_SIZE), returnType: 'JSON' }
  }
};

await mkdir('data', { recursive: true });
let failures = 0;

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
  const type = response.headers.get('content-type') || '';
  if (!response.ok || !type.includes('application/json')) throw new Error(`HTTP ${response.status} ${type}`);
  return response.json();
}

async function fetchHousingData(feed) {
  const url = new URL(feed.url);
  url.searchParams.set('serviceKey', feed.key);
  url.searchParams.set('page', '1');
  url.searchParams.set('perPage', String(HOUSING_PAGE_SIZE));
  url.searchParams.set('returnType', 'JSON');

  const first = await fetchJson(url);
  const allItems = Array.isArray(first.data) ? [...first.data] : [];
  const total = Number(first.totalCount || first.matchCount || allItems.length);
  const pages = Math.ceil(total / HOUSING_PAGE_SIZE);

  for (let page = 2; page <= pages; page++) {
    url.searchParams.set('page', String(page));
    const data = await fetchJson(url);
    if (Array.isArray(data.data)) allItems.push(...data.data);
  }

  return { ...first, currentCount: allItems.length, data: allItems };
}

for (const [name, feed] of Object.entries(feeds)) {
  if (!feed.key) { console.error(`${name}: API 키가 없습니다.`); failures++; continue; }
  const url = new URL(feed.url || feed.path, feed.url ? undefined : 'https://www.youthcenter.go.kr');
  if (name === 'housing') {
    url.searchParams.set('serviceKey', feed.key);
    for (const [key, value] of Object.entries(feed.params)) url.searchParams.set(key, value);
  } else {
    url.searchParams.set('apiKeyNm', feed.key);
    url.searchParams.set('pageNum', '1');
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('rtnType', 'json');
  }
  try {
    const data = name === 'housing' ? await fetchHousingData(feed) : await fetchJson(url);
    const items = name === 'policy'
      ? data?.result?.youthPolicyList
      : name === 'content'
        ? (data?.result?.contentList || data?.result?.data)
        : (data?.data || data?.items || data?.response?.body?.items?.item);
    const titleKeys = name === 'policy'
      ? ['plcyNm', 'polyBizSjnm', 'title']
      : name === 'content'
        ? ['pstTtl', 'contentTitle', 'title']
        : ['주택명', 'HOUSE_NM', 'houseNm', 'hsmpNm', 'pblancNm', 'SUPLY_NM', 'name', 'title'];
    const hasUsableItem = Array.isArray(items) && items.some(item => titleKeys.some(key => String(item?.[key] || '').trim()));
    if (!hasUsableItem) throw new Error('핵심 데이터 필드가 비어 있습니다. 기존 파일을 유지합니다.');
    await writeFile(`data/${name}.json`, JSON.stringify(data), 'utf8');
    console.log(`${name}: 동기화 완료`);
  } catch (error) {
    console.error(`${name}: ${error.message}`);failures++;
  }
}

if (failures === Object.keys(feeds).length) process.exitCode = 1;
