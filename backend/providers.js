const axios = require('axios');

const AI_PROVIDERS = {
  google: {
    getEmbedding: async (text, apiKey, modelName) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${apiKey}`;
      const res = await axios.post(url, { model: `models/${modelName}`, content: { parts: [{ text }] }, outputDimensionality: 768 }, { headers: { 'Content-Type': 'application/json' }});
      return res.data.embedding.values;
    },
    generateAnswer: async (prompt, apiKey, modelName) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await axios.post(url, { contents: [{ parts: [{ text: prompt }] }] }, { headers: { 'Content-Type': 'application/json' }});
      return res.data.candidates[0].content.parts[0].text;
    }
  },
  openai: {
    getEmbedding: async (text, apiKey, modelName) => {
      const res = await axios.post('https://api.openai.com/v1/embeddings', { input: text, model: modelName }, { headers: { 'Authorization': `Bearer ${apiKey}` }});
      return res.data.data[0].embedding;
    },
    generateAnswer: async (prompt, apiKey, modelName) => {
      const res = await axios.post('https://api.openai.com/v1/chat/completions', { model: modelName, messages: [{ role: 'user', content: prompt }] }, { headers: { 'Authorization': `Bearer ${apiKey}` }});
      return res.data.choices[0].message.content;
    }
  },
  xai: {
    getEmbedding: async (text, apiKey, modelName) => {
      const res = await axios.post('https://api.x.ai/v1/embeddings', { input: text, model: modelName }, { headers: { 'Authorization': `Bearer ${apiKey}` }});
      return res.data.data[0].embedding;
    },
    generateAnswer: async (prompt, apiKey, modelName) => {
      const res = await axios.post('https://api.x.ai/v1/chat/completions', { model: modelName, messages: [{ role: 'user', content: prompt }] }, { headers: { 'Authorization': `Bearer ${apiKey}` }});
      return res.data.choices[0].message.content;
    }
  },
  anthropic: {
    getEmbedding: async () => {
      throw new Error("Anthropic 不提供原生 Embedding，請選擇 OpenAI, Google 或 xAI 進行初始化。");
    },
    generateAnswer: async (prompt, apiKey, modelName) => {
      const res = await axios.post('https://api.anthropic.com/v1/messages', { model: modelName, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }, { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }});
      return res.data.content[0].text;
    }
  }
};

module.exports = AI_PROVIDERS;