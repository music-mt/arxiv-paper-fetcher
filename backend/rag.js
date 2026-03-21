const AI_PROVIDERS = require('./providers');

const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const getEmbedding = async (text, apiKey, providerId, embedModel) => {
  return await AI_PROVIDERS[providerId].getEmbedding(text, apiKey, embedModel);
};

const generateAnswer = async (query, context, apiKey, providerId, chatModel) => {
  const prompt = `你是一位嚴謹的學術助理。請根據以下【論文摘要】回答問題。回答請保持專業且口語化，適合語音朗讀。若摘要中沒有答案，請直接告知。\n\n【論文摘要】：\n${context}\n\n【問題】：${query}`;
  return await AI_PROVIDERS[providerId].generateAnswer(prompt, apiKey, chatModel);
};

module.exports = { getEmbedding, cosineSimilarity, generateAnswer };