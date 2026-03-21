const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({ ignoreAttributes: false });

const arxivScraper = async (query = 'machine learning', maxResults = 10) => {
  try {
    console.log(`🔍 正在向 arXiv API 搜尋最新文獻: ${query}`);
    
    // 🌟 關鍵修改：加入了 sortBy=submittedDate & sortOrder=descending
    // 這樣 API 就會強制回傳「最新發表」的論文，與你在官網看到的第一頁同步！
    const arxivUrl = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=${maxResults}`;
    
    const response = await axios.get(arxivUrl);
    
    // 將 XML 解析為 JSON
    const jsonObj = parser.parse(response.data);
    let entries = jsonObj.feed.entry || [];
    
    // 如果只有一篇論文，fast-xml-parser 回傳的會是物件而非陣列，這裡強制轉為陣列
    if (!Array.isArray(entries)) entries = [entries];

    // 整理論文資料格式
    const papers = entries.map(entry => {
      // 找出 PDF 連結
      const links = Array.isArray(entry.link) ? entry.link : [entry.link];
      const pdfLink = links.find(l => l['@_title'] === 'pdf' || (l['@_href'] && l['@_href'].includes('pdf')));

      return {
        id: entry.id ? entry.id.split('/abs/')[1] : Math.random().toString(),
        title: entry.title.replace(/\n/g, ' ').trim(),
        content: entry.summary.replace(/\n/g, ' ').trim(), // 將摘要作為 RAG 核心文本
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