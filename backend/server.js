require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { arxivScraper } = require('./scraper');
const { getEmbedding, cosineSimilarity, generateAnswer } = require('./rag');

const app = express();
app.use(cors());
app.use(express.json());

// 模擬向量數據庫，儲存於伺服器記憶體中
let vectorDatabase = {};

// Render 部署用的健康檢查接口
app.get('/health', (req, res) => res.status(200).send('arXiv Backend is running!'));

/**
 * 步驟 1: 初始化論文庫
 * 抓取 arXiv 最新文獻並進行向量化
 */
app.post('/api/arxiv/init', async (req, res) => {
  const { searchQuery, apiKey, providerId, embedModel } = req.body;
  console.log(`\n⚡ 啟動 arXiv 論文內化: ${searchQuery} (使用平台: ${providerId})`);

  try {
    // 🌟 強化點：將抓取數量提升至 20 篇，確保覆蓋更多最新研究
    const papers = await arxivScraper(searchQuery, 20); 
    const db = [];
    
    if (papers.length === 0) {
      return res.status(404).json({ error: '找不到相關論文，請嘗試其他關鍵字' });
    }

    for (let i = 0; i < papers.length; i++) {
      console.log(`⏳ 向量化 [${i+1}/${papers.length}]: ${papers[i].title}`);
      
      try {
        const embedding = await getEmbedding(papers[i].content, apiKey, providerId, embedModel);
        db.push({ 
          text: papers[i].content, 
          embedding, 
          metadata: { 
            title: papers[i].title, 
            url: papers[i].pdf_url,
            authors: papers[i].authors
          }
        });
        // 稍微延遲以避免觸發 API 頻率限制
        await new Promise(r => setTimeout(r, 200)); 
      } catch (embedError) {
        console.error(`❌ 向量化失敗 (第 ${i+1} 篇):`, embedError.message);
      }
    }

    // 將處理好的向量存入對應關鍵字的資料庫中
    vectorDatabase[searchQuery] = { chunks: db };
    console.log(`✨ “${searchQuery}” 知識庫建立完畢，共 ${db.length} 篇有效文獻。`);
    
    res.json({ 
      message: `“${searchQuery}” 載入成功！`, 
      totalPapers: db.length 
    });
  } catch (error) {
    console.error(`🔥 初始化嚴重錯誤:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 步驟 2: RAG 對話
 * 檢索最相關的文獻片段並生成回答
 */
app.post('/api/chat', async (req, res) => {
  const { searchQuery, apiKey, query, providerId, embedModel, chatModel } = req.body;
  
  if (!vectorDatabase[searchQuery]) {
    return res.status(400).json({ error: '請先初始化論文庫' });
  }

  try {
    console.log(`🔍 正在處理提問: "${query}"`);
    
    // 1. 將使用者的問題轉化為向量
    const queryVector = await getEmbedding(query, apiKey, providerId, embedModel);
    
    // 2. 計算相似度並排序
    const db = vectorDatabase[searchQuery].chunks;
    const scoredChunks = db.map(item => ({ 
      text: item.text, 
      metadata: item.metadata, 
      score: cosineSimilarity(queryVector, item.embedding) 
    })).sort((a, b) => b.score - a.score);

    // 🌟 強化點：讓 AI 參考前 10 名最相關的摘要 (從 5 提升到 10)，回答更精準
    const topContext = scoredChunks
      .slice(0, 10) 
      .map(c => `[論文標題: ${c.metadata.title}]\n[摘要]: ${c.text}`)
      .join('\n\n---\n\n');
    
    // 3. 呼叫大語言模型生成答案
    const answer = await generateAnswer(query, topContext, apiKey, providerId, chatModel);
    
    res.json({ answer });
  } catch (error) {
    console.error(`🔥 對話出錯:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 步驟 3: 清除快取
 */
app.post('/api/clear', (req, res) => {
  const { searchQuery } = req.body;
  delete vectorDatabase[searchQuery];
  console.log(`🧹 已清除關鍵字 "${searchQuery}" 的向量緩存`);
  res.json({ message: '記憶已清除' });
});

// 啟動伺服器
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ arXiv Backend is running!`);
  console.log(`✅ 後端啟動於 Port ${PORT}`);
  console.log(`🚀 RAG 模式已激活: 抓取量 20, 參考量 10`);
});