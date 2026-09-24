const AI_PROVIDERS = require('./providers');

const cosineSimilarity = (vecA, vecB) => {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecA.length !== vecB.length) {
    return Number.NEGATIVE_INFINITY;
  }
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? Number.NEGATIVE_INFINITY : dotProduct / denominator;
};

const getEmbedding = async (text, apiKey, providerId, embedModel) => {
  if (!AI_PROVIDERS[providerId]) throw new Error('不支援的 AI provider');
  return await AI_PROVIDERS[providerId].getEmbedding(text, apiKey, embedModel);
};

const generateAnswer = async (query, context, apiKey, providerId, chatModel) => {
  if (!AI_PROVIDERS[providerId]) throw new Error('不支援的 AI provider');
  const prompt = `你是一位嚴謹的學術助理。請根據以下【論文摘要】回答問題。回答請保持專業且口語化，適合語音朗讀。若摘要中沒有答案，請直接告知。\n\n【論文摘要】：\n${context}\n\n【問題】：${query}`;
  return await AI_PROVIDERS[providerId].generateAnswer(prompt, apiKey, chatModel);
};

// Limits simultaneous provider calls without returning to the slow, fully serial path.
const embedPapers = async (papers, apiKey, providerId, embedModel, concurrency = 3) => {
  const results = new Array(papers.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < papers.length) {
      const index = nextIndex++;
      const paper = papers[index];
      results[index] = {
        text: paper.content,
        embedding: await getEmbedding(paper.content, apiKey, providerId, embedModel),
        metadata: paper
      };
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, papers.length) }, worker));
  return results;
};

module.exports = { getEmbedding, cosineSimilarity, generateAnswer, embedPapers };
