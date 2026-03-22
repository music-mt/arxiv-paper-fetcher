require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { arxivScraper } = require('./scraper');
const { getEmbedding, cosineSimilarity, generateAnswer } = require('./rag');

const app = express();
app.use(cors());
app.use(express.json());

let vectorDatabase = {};

app.get('/health', (req, res) => res.status(200).send('OK'));

// 初始化接口
app.post('/api/arxiv/init', async (req, res) => {
  const { searchQuery, apiKey, providerId, embedModel } = req.body;
  try {
    const papers = await arxivScraper(searchQuery, 20, 0); 
    const db = [];
    for (let i = 0; i < papers.length; i++) {
      const embedding = await getEmbedding(papers[i].content, apiKey, providerId, embedModel);
      db.push({ text: papers[i].content, embedding, metadata: papers[i] });
    }
    vectorDatabase[searchQuery] = { chunks: db };
    res.json({ message: '初始化成功', papers: papers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 追加搜尋接口
app.post('/api/arxiv/more', async (req, res) => {
  const { searchQuery, apiKey, providerId, embedModel, start } = req.body;
  try {
    const newPapers = await arxivScraper(searchQuery, 10, start); 
    if (!vectorDatabase[searchQuery]) return res.status(400).json({ error: '請先初始化' });
    
    const db = vectorDatabase[searchQuery].chunks;
    for (let i = 0; i < newPapers.length; i++) {
      const embedding = await getEmbedding(newPapers[i].content, apiKey, providerId, embedModel);
      db.push({ text: newPapers[i].content, embedding, metadata: newPapers[i] });
    }
    res.json({ message: '追加成功', addedPapers: newPapers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 對話接口 (已加入 AI 意識同步)
app.post('/api/chat', async (req, res) => {
  const { searchQuery, apiKey, query, providerId, chatModel, embedModel } = req.body;
  try {
    if (!vectorDatabase[searchQuery]) return res.status(400).json({ error: '找不到知識庫' });
    
    const db = vectorDatabase[searchQuery].chunks;
    const totalInDB = db.length; // 🌟 獲取目前資料庫總篇數 

    const queryVector = await getEmbedding(query, apiKey, providerId, embedModel);
    const scoredChunks = db.map(item => ({ 
      text: item.text, 
      metadata: item.metadata, 
      score: cosineSimilarity(queryVector, item.embedding) 
    })).sort((a, b) => b.score - a.score);

    const topContext = scoredChunks.slice(0, 10).map(c => `[論文: ${c.metadata.title}]\n${c.text}`).join('\n\n');
    
    // 🌟 強化 Prompt：告知 AI 目前的文獻總數與背景 
    const enhancedQuery = `使用者正在與你討論關於「${searchQuery}」的主題。
    目前你的知識庫中已經累積了 ${totalInDB} 篇相關論文摘要。
    以下是從中檢索出與問題最相關的 10 篇內容，請以此回答使用者。
    如果使用者提到要搜尋更多，請提醒他們可以點擊右上角的「繼續搜尋」按鈕。
    
    使用者問題：${query}`;

    const answer = await generateAnswer(enhancedQuery, topContext, apiKey, providerId, chatModel);
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));