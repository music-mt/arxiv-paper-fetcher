require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { arxivScraper } = require('./scraper');
const { getEmbedding, cosineSimilarity, generateAnswer } = require('./rag');

const app = express();
app.use(cors());
app.use(express.json());

let vectorDatabase = {};

app.get('/health', (req, res) => res.status(200).send('arXiv Backend is running!'));

app.post('/api/arxiv/init', async (req, res) => {
  const { searchQuery, apiKey, providerId, embedModel } = req.body;
  console.log(`\n⚡ 啟動 arXiv 論文內化: ${searchQuery} (使用 ${providerId})`);

  try {
    const papers = await arxivScraper(searchQuery, 10);
    const db = [];
    
    for (let i = 0; i < papers.length; i++) {
      console.log(`⏳ 向量化 [${i+1}/${papers.length}]: ${papers[i].title}`);
      const embedding = await getEmbedding(papers[i].content, apiKey, providerId, embedModel);
      db.push({ text: papers[i].content, embedding, metadata: { title: papers[i].title, url: papers[i].pdf_url }});
      await new Promise(r => setTimeout(r, 200));
    }

    vectorDatabase[searchQuery] = { chunks: db };
    res.json({ message: `“${searchQuery}” 載入成功！`, totalPapers: papers.length });
  } catch (error) {
    console.error(`🔥 初始化失敗:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { searchQuery, apiKey, query, providerId, embedModel, chatModel } = req.body;
  if (!vectorDatabase[searchQuery]) return res.status(400).json({ error: '請先初始化論文庫' });

  try {
    const queryVector = await getEmbedding(query, apiKey, providerId, embedModel);
    const db = vectorDatabase[searchQuery].chunks;
    const scoredChunks = db.map(item => ({ text: item.text, metadata: item.metadata, score: cosineSimilarity(queryVector, item.embedding) })).sort((a, b) => b.score - a.score);

    const topContext = scoredChunks.slice(0, 5).map(c => `[論文: ${c.metadata.title}]\n摘要: ${c.text}`).join('\n\n');
    const answer = await generateAnswer(query, topContext, apiKey, providerId, chatModel);
    
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clear', (req, res) => {
  delete vectorDatabase[req.body.searchQuery];
  res.json({ message: '記憶已清除' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => console.log(`✅ 後端啟動於 Port ${PORT}`));