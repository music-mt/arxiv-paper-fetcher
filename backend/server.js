require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const { arxivScraper } = require('./scraper');
const { getConcept } = require('./concepts');
const { getEmbedding, cosineSimilarity, generateAnswer, isConceptQuestion, explainConcept, translateSearchQuery, embedPapers, buildEvidenceContext, citedSources } = require('./rag');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const vectorDatabases = new Map();
const MAX_QUERY_LENGTH = 200;
const MAX_CHAT_LENGTH = 4_000;
const MAX_RESTORE_PAPERS = 100;

const cleanText = (value, maxLength) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
const requireFields = (body, fields) => fields.every(field => cleanText(body[field], field === 'query' ? MAX_CHAT_LENGTH : MAX_QUERY_LENGTH));
const fail = (res, error, status = 400) => res.status(status).json({ error });
const addUniquePapers = (database, papers) => {
  const existingIds = new Set(database.chunks.map(chunk => chunk.metadata.id));
  return papers.filter(paper => !existingIds.has(paper.id));
};

app.get('/health', (req, res) => res.set('X-App-Version', 'concept-accuracy-2026-09-25').status(200).send('OK'));

// 初始化接口
app.post('/api/arxiv/init', async (req, res) => {
  const searchQuery = cleanText(req.body.searchQuery, MAX_QUERY_LENGTH);
  const { apiKey, providerId, embedModel, chatModel } = req.body;
  if (!requireFields(req.body, ['searchQuery', 'apiKey', 'providerId', 'embedModel', 'chatModel'])) return fail(res, '缺少必要的初始化欄位');
  try {
    const arxivQuery = await translateSearchQuery(searchQuery, apiKey, providerId, chatModel);
    let searchMode = 'phrase';
    let papers = await arxivScraper(arxivQuery, 20, 0, searchMode);
    if (papers.length === 0 && arxivQuery.includes(' ')) {
      searchMode = 'terms';
      papers = await arxivScraper(arxivQuery, 20, 0, searchMode);
    }
    if (papers.length === 0) return fail(res, `找不到「${arxivQuery}」相關論文，請換個關鍵字再試`, 404);
    const chunks = await embedPapers(papers, apiKey, providerId, embedModel);
    const sessionId = randomUUID();
    vectorDatabases.set(sessionId, { searchQuery, arxivQuery, searchMode, chunks, createdAt: Date.now() });
    res.json({ message: '初始化成功', sessionId, papers, arxivQuery, searchMode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Render 重啟後記憶體索引會消失；使用瀏覽器保留的論文摘要重建同一批索引。
app.post('/api/arxiv/restore', async (req, res) => {
  const { apiKey, providerId, embedModel, papers } = req.body;
  const searchQuery = cleanText(req.body.searchQuery, MAX_QUERY_LENGTH);
  const arxivQuery = cleanText(req.body.arxivQuery, MAX_QUERY_LENGTH);
  const searchMode = req.body.searchMode === 'terms' ? 'terms' : 'phrase';
  if (!requireFields(req.body, ['apiKey', 'providerId', 'embedModel', 'searchQuery', 'arxivQuery']) ||
      !Array.isArray(papers) || papers.length < 1 || papers.length > MAX_RESTORE_PAPERS) {
    return fail(res, '無法還原論文工作階段');
  }
  const validPapers = papers.every(paper => paper &&
    cleanText(paper.id, 101) === paper.id && paper.id.length <= 100 &&
    cleanText(paper.title, 501) === paper.title && paper.title.length <= 500 &&
    cleanText(paper.content, 10_001) === paper.content && paper.content.length <= 10_000);
  if (!validPapers) return fail(res, '論文資料格式不正確');
  try {
    const chunks = await embedPapers(papers, apiKey, providerId, embedModel);
    const sessionId = randomUUID();
    vectorDatabases.set(sessionId, { searchQuery, arxivQuery, searchMode, chunks, createdAt: Date.now() });
    res.json({ message: '工作階段已還原', sessionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 追加搜尋接口
app.post('/api/arxiv/more', async (req, res) => {
  const { sessionId, apiKey, providerId, embedModel } = req.body;
  const start = Number.parseInt(req.body.start, 10);
  if (!requireFields(req.body, ['sessionId', 'apiKey', 'providerId', 'embedModel']) || !Number.isInteger(start) || start < 0) return fail(res, '請提供有效的追加搜尋參數');
  const database = vectorDatabases.get(sessionId);
  if (!database) return fail(res, '工作階段已過期', 410);
  try {
    const fetchedPapers = await arxivScraper(database.arxivQuery, 10, start, database.searchMode);
    const newPapers = addUniquePapers(database, fetchedPapers);
    const chunks = await embedPapers(newPapers, apiKey, providerId, embedModel);
    database.chunks.push(...chunks);
    res.json({ message: '追加成功', addedPapers: newPapers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 對話接口 (已加入 AI 意識同步)
app.post('/api/chat', async (req, res) => {
  const { sessionId, apiKey, providerId, chatModel, embedModel } = req.body;
  const query = cleanText(req.body.query, MAX_CHAT_LENGTH);
  if (!requireFields(req.body, ['sessionId', 'apiKey', 'query', 'providerId', 'chatModel', 'embedModel'])) return fail(res, '缺少必要的對話欄位');
  if (isConceptQuestion(query)) {
    const concept = getConcept(query);
    if (concept) {
      return res.json({
        answer: concept.answer,
        sources: concept.sources.map((source, index) => ({ number: index + 1, ...source })),
        sourceLabel: '參考資料'
      });
    }
    try {
      const answer = await explainConcept(query, apiKey, providerId, chatModel);
      return res.json({ answer, sources: [] });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
  const database = vectorDatabases.get(sessionId);
  if (!database) return fail(res, '工作階段已過期', 410);
  try {
    const db = database.chunks;
    if (db.length === 0) return fail(res, '知識庫目前沒有論文，請重新搜尋');
    const queryVector = await getEmbedding(query, apiKey, providerId, embedModel);
    const scoredChunks = db.map(item => ({ 
      text: item.text, 
      metadata: item.metadata, 
      score: cosineSimilarity(queryVector, item.embedding) 
    })).sort((a, b) => b.score - a.score);

    // 相似度只是排序，不代表摘要足以支持答案；由回答規則再檢查證據。
    const topChunks = scoredChunks.slice(0, 8);
    const answer = await generateAnswer(query, buildEvidenceContext(topChunks), apiKey, providerId, chatModel);
    const sources = citedSources(answer, topChunks);
    // 模型偶爾會在「無直接證據」的文字後仍附上編號；避免顯示無效引用。
    const safeAnswer = sources.length === 0 ? answer.replace(/\s*\[\d+\]/g, '') : answer;
    res.json({ answer: safeAnswer, sources });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5001;
if (require.main === module) app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));

module.exports = app;
