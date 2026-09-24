const test = require('node:test');
const assert = require('node:assert/strict');
const rag = require('./rag');

rag.embedPapers = async papers => papers.map(paper => ({ text: paper.content, embedding: [1, 0], metadata: paper }));
rag.getEmbedding = async () => [1, 0];
rag.generateAnswer = async () => JSON.stringify({ mode: 'general', answer: '這是一般概念的簡短說明。' });

const app = require('./server');

test('expired session can be restored from the same papers and queried again', async () => {
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = async (path, body) => {
      const response = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return { status: response.status, data: await response.json() };
    };
    const credentials = { apiKey: 'test-key', providerId: 'google', embedModel: 'test-model' };
    const expired = await post('/api/chat', {
      ...credentials, chatModel: 'test-model', sessionId: 'expired', query: '這篇論文的結果是什麼'
    });
    assert.equal(expired.status, 410);

    const papers = [{ id: '1234.5678', title: 'Tensor network example', content: 'A tensor network summary.', pdf_url: 'https://arxiv.org/pdf/1234.5678.pdf' }];
    const restored = await post('/api/arxiv/restore', {
      ...credentials, searchQuery: '量子計算', arxivQuery: 'quantum computing', searchMode: 'phrase', papers
    });
    assert.equal(restored.status, 200);
    assert.ok(restored.data.sessionId);

    const answer = await post('/api/chat', {
      ...credentials, chatModel: 'test-model', sessionId: restored.data.sessionId, query: '張量網路'
    });
    assert.equal(answer.status, 200);
    assert.equal(answer.data.grounding, 'general');
    assert.deepEqual(answer.data.sources, []);

    const paperOnly = await post('/api/chat', {
      ...credentials, chatModel: 'test-model', sessionId: restored.data.sessionId, query: '只根據這批論文說明張量網路'
    });
    assert.equal(paperOnly.data.grounding, 'insufficient');

    const invalid = await post('/api/arxiv/restore', {
      ...credentials, searchQuery: '量子計算', arxivQuery: 'quantum computing', papers: [{ title: 'missing abstract' }]
    });
    assert.equal(invalid.status, 400);
  } finally {
    server.close();
  }
});
