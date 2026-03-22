const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({ ignoreAttributes: false });

const arxivScraper = async (query = 'machine learning', maxResults = 10, start = 0) => {
  try {
    console.log(`🔍 正在搜尋 arXiv: ${query} (從第 ${start} 篇開始，抓取 ${maxResults} 篇)`);
    
    // 增加 start 參數，確保分頁功能正常
    const arxivUrl = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&sortBy=submittedDate&sortOrder=descending&start=${start}&max_results=${maxResults}`;
    
    const response = await axios.get(arxivUrl);
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
        pdf_url: pdfLink ? pdfLink['@_href'] + '.pdf' : null
      };
    });

    return papers;
  } catch (error) {
    throw new Error(`arXiv API 抓取失敗: ${error.message}`);
  }
};

module.exports = { arxivScraper };