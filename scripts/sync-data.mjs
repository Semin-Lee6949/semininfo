import { mkdir, writeFile } from 'node:fs/promises';

const feeds = {
  policy: { path: '/go/ythip/getPlcy', key: process.env.YOUTH_POLICY_API_KEY },
  content: { path: '/go/ythip/getContent', key: process.env.YOUTH_CONTENT_API_KEY }
};

await mkdir('data', { recursive: true });
let failures = 0;

for (const [name, feed] of Object.entries(feeds)) {
  if (!feed.key) { console.error(`${name}: API 키가 없습니다.`); failures++; continue; }
  const url = new URL(feed.path, 'https://www.youthcenter.go.kr');
  url.searchParams.set('apiKeyNm', feed.key);
  url.searchParams.set('pageNum', '1');
  url.searchParams.set('pageSize', '100');
  url.searchParams.set('rtnType', 'json');
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !type.includes('application/json')) throw new Error(`HTTP ${response.status} ${type}`);
    const data = await response.json();
    const items = name === 'policy' ? data?.result?.youthPolicyList : (data?.result?.contentList || data?.result?.data);
    const titleKeys = name === 'policy' ? ['plcyNm', 'polyBizSjnm', 'title'] : ['pstTtl', 'contentTitle', 'title'];
    const hasUsableItem = Array.isArray(items) && items.some(item => titleKeys.some(key => String(item?.[key] || '').trim()));
    if (!hasUsableItem) throw new Error('핵심 데이터 필드가 비어 있습니다. 기존 파일을 유지합니다.');
    await writeFile(`data/${name}.json`, JSON.stringify(data), 'utf8');
    console.log(`${name}: 동기화 완료`);
  } catch (error) {
    console.error(`${name}: ${error.message}`);failures++;
  }
}

if (failures === Object.keys(feeds).length) process.exitCode = 1;
