const axios = require('axios');

const client = axios.create({ timeout: 30_000 });

const request = async (...args) => {
  try {
    return await client.post(...args);
  } catch (error) {
    const detail = error.response?.data?.error?.message || error.response?.data?.error?.type || error.message;
    throw new Error(`AI provider request failed: ${detail}`);
  }
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const retryTransientRequest = async (operation) => {
  let lastError;
  for (const delay of [0, 750, 1_500]) {
    if (delay) await sleep(delay);
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!/high demand|temporar|rate limit|\b429\b/i.test(error.message)) throw error;
    }
  }
  throw lastError;
};

const requireText = (text, provider) => {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error(`${provider} 未回傳可顯示的文字；請檢查模型存取權限、內容安全設定或用量配額`);
  }
  return text;
};

const AI_PROVIDERS = {
  google: {
    getEmbedding: async (text, apiKey, modelName) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${apiKey}`;
      const res = await request(url, { model: `models/${modelName}`, content: { parts: [{ text }] }, outputDimensionality: 768 }, { headers: { 'Content-Type': 'application/json' }});
      return res.data.embedding.values;
    },
    generateAnswer: async (prompt, apiKey, modelName) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await retryTransientRequest(() => request(
        url,
        { contents: [{ parts: [{ text: prompt }] }] },
        { headers: { 'Content-Type': 'application/json' }}
      ));
      const text = res.data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || '')
        .join('');
      return requireText(text, 'Google AI');
    }
  },
  openai: {
    getEmbedding: async (text, apiKey, modelName) => {
      const res = await request('https://api.openai.com/v1/embeddings', { input: text, model: modelName }, { headers: { 'Authorization': `Bearer ${apiKey}` }});
      return res.data.data[0].embedding;
    },
    generateAnswer: async (prompt, apiKey, modelName) => {
      const res = await request('https://api.openai.com/v1/chat/completions', { model: modelName, messages: [{ role: 'user', content: prompt }] }, { headers: { 'Authorization': `Bearer ${apiKey}` }});
      return requireText(res.data.choices?.[0]?.message?.content, 'OpenAI');
    }
  },
  xai: {
    getEmbedding: async (text, apiKey, modelName) => {
      const res = await request('https://api.x.ai/v1/embeddings', { input: text, model: modelName }, { headers: { 'Authorization': `Bearer ${apiKey}` }});
      return res.data.data[0].embedding;
    },
    generateAnswer: async (prompt, apiKey, modelName) => {
      const res = await request('https://api.x.ai/v1/chat/completions', { model: modelName, messages: [{ role: 'user', content: prompt }] }, { headers: { 'Authorization': `Bearer ${apiKey}` }});
      return requireText(res.data.choices?.[0]?.message?.content, 'xAI');
    }
  },
  anthropic: {
    getEmbedding: async () => {
      throw new Error("Anthropic 不提供原生 Embedding，請選擇 OpenAI, Google 或 xAI 進行初始化。");
    },
    generateAnswer: async (prompt, apiKey, modelName) => {
      const res = await request('https://api.anthropic.com/v1/messages', { model: modelName, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }, { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }});
      return requireText(res.data.content?.[0]?.text, 'Anthropic');
    }
  }
};

module.exports = AI_PROVIDERS;
