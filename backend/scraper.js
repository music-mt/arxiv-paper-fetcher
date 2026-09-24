const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({ ignoreAttributes: false });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const fetchFeed = async (url) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await axios.get(url, {
        timeout: 15_000,
        headers: { 'User-Agent': 'arxiv-paper-fetcher/1.1 (academic RAG client)', Accept: 'application/atom+xml' }
      });
    } catch (error) {
      const retryableStatus = [406, 429, 502, 503, 504].includes(error.response?.status);
      const retryableNetworkError = ['ECONNRESET', 'ETIMEDOUT'].includes(error.code);
      if (attempt === 2 || (!retryableStatus && !retryableNetworkError)) throw error;
      await sleep(3_000 * (attempt + 1));
    }
  }
};

const arxivScraper = async (query = 'machine learning', maxResults = 10, start = 0, mode = 'phrase') => {
  try {
    console.log(`🔍 正在搜尋 arXiv: ${query} (從第 ${start} 篇開始，抓取 ${maxResults} 篇)`);
    
    // 增加 start 參數，確保分頁功能正常
    const phrase = query.replace(/[^A-Za-z0-9 .+-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!phrase) throw new Error('搜尋關鍵字不能為空');
    const expression = mode === 'terms'
      ? phrase.split(' ').slice(0, 6).map(term => `all:${term}`).join(' AND ')
      : `all:"${phrase}"`;
    const arxivUrl = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(expression)}&sortBy=submittedDate&sortOrder=descending&start=${start}&max_results=${maxResults}`;
    
    const response = await fetchFeed(arxivUrl);
    const jsonObj = parser.parse(response.data);
    let entries = jsonObj.feed.entry || [];
    
    if (!Array.isArray(entries)) entries = [entries];

    const papers = entries.map(entry => {
      const links = Array.isArray(entry.link) ? entry.link : [entry.link];
      const pdfLink = links.find(l => l['@_title'] === 'pdf' || (l['@_href'] && l['@_href'].includes('pdf')));

      return {
        id: entry.id ? entry.id.split('/abs/')[1] : Math.random().toString(),
        title: entry.title.replace(/\n/g, ' ').trim(),
        content: entry.summary.replace(/\n/g, ' ').trim(),
        authors: Array.isArray(entry.author) ? entry.author.map(a => a.name).join(', ') : entry.author?.name || 'Unknown',
        pdf_url: pdfLink ? (pdfLink['@_href'].endsWith('.pdf') ? pdfLink['@_href'] : `${pdfLink['@_href']}.pdf`) : null
      };
    });

    return papers;
  } catch (error) {
    throw new Error(`arXiv API 抓取失敗: ${error.message}`);
  }
};

module.exports = { arxivScraper };
