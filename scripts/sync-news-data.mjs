import { mkdir, writeFile } from 'node:fs/promises';

const NAVER_NEWS_URL = 'https://openapi.naver.com/v1/search/news.json';
const DEFAULT_QUERIES = [
  { query: '청년정책', category: '정책' },
  { query: '청년 주거 월세 청약', category: '주거' },
  { query: '청년 취업 일자리', category: '일자리' },
  { query: '청년 금융 자산형성', category: '금융' },
  { query: '청년 복지 생활', category: '생활' }
];

const clientId = process.env.NAVER_CLIENT_ID;
const clientSecret = process.env.NAVER_CLIENT_SECRET;
const display = Number(process.env.NAVER_NEWS_DISPLAY || 20);
const queries = parseQueries(process.env.NAVER_NEWS_QUERIES);

if (!clientId || !clientSecret) {
  console.error('NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 값이 없습니다.');
  process.exit(1);
}

await mkdir('data', { recursive: true });

const collected = [];
for (const item of queries) {
  try {
    const news = await fetchNews(item.query);
    collected.push(...news.items.map(article => ({ ...article, category: item.category, source: inferSource(article) })));
    console.log(`${item.query}: ${news.items.length}건 수집`);
  } catch (error) {
    console.error(`${item.query}: ${error.message}`);
  }
}

const items = dedupe(collected)
  .sort((a, b) => Date.parse(b.pubDate || '') - Date.parse(a.pubDate || ''))
  .slice(0, 100);

if (!items.length) {
  console.error('저장할 뉴스 데이터가 없습니다. 기존 파일을 유지합니다.');
  process.exit(1);
}

await writeFile('data/news.json', JSON.stringify({
  source: '네이버 뉴스 검색 API',
  syncedAt: new Date().toISOString(),
  queries,
  total: items.length,
  items
}, null, 2), 'utf8');

console.log(`news: ${items.length}건 동기화 완료`);

function parseQueries(value) {
  if (!value) return DEFAULT_QUERIES;
  return value.split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const [query, category] = part.split(':').map(token => token.trim());
      return { query, category: category || inferCategory(query) };
    });
}

function inferCategory(text) {
  if (/주거|월세|전세|청약|임대|주택|보증금/.test(text)) return '주거';
  if (/취업|채용|일자리|직무|재직|구직|창업/.test(text)) return '일자리';
  if (/금융|저축|계좌|대출|자산|은행|적금/.test(text)) return '금융';
  if (/문화|복지|상담|건강|생활|고립|은둔/.test(text)) return '생활';
  return '정책';
}

function inferSource(item) {
  try {
    const url = new URL(item.originallink || item.link);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '네이버 뉴스';
  }
}

async function fetchNews(query) {
  const url = new URL(NAVER_NEWS_URL);
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(Math.min(Math.max(display, 1), 100)));
  url.searchParams.set('start', '1');
  url.searchParams.set('sort', 'date');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret
    },
    signal: AbortSignal.timeout(30000)
  });

  const body = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status} ${body.slice(0, 160)}`);

  const data = JSON.parse(body);
  if (!Array.isArray(data.items)) throw new Error('items 배열이 없습니다.');
  return data;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.originallink || item.link || item.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
