const test = require('node:test');
const assert = require('node:assert/strict');
const rag = require('./rag');

rag.embedPapers = async papers => papers.map(paper => ({ text: paper.content, embedding: [1, 0], metadata: paper }));
rag.getEmbedding = async () => [1, 0];
rag.generateAnswer = async () => '一般說明（非這批論文的結論）：張量網路以張量收縮表示系統。';
rag.explainConcept = async () => '張量網路以張量收縮表示系統。';

const app = require('./server');

test('short concept terms are explanations, not paper-evidence requests', () => {
  for (const query of ['量子加密', '量子糾纏', '說明張量', '張量網路']) {
    assert.equal(rag.isConceptQuestion(query), true);
  }
  assert.equal(rag.isConceptQuestion('只根據這篇論文'), false);
  assert.equal(rag.isConceptQuestion('introduction to tensors'), false);
});

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

    const concept = await post('/api/chat', {
      ...credentials, chatModel: 'test-model', sessionId: 'expired', query: '張量網路'
    });
    assert.equal(concept.status, 200);
    assert.match(concept.data.answer, /不是任何 50 量子位元系統/);
    assert.equal(concept.data.sourceLabel, '參考資料');
    assert.equal(concept.data.sources.length, 1);

    const encryption = await post('/api/chat', {
      ...credentials, chatModel: 'test-model', sessionId: 'expired', query: '量子加密'
    });
    assert.match(encryption.data.answer, /不能保證實際設備絕對安全/);

    const papers = [{ id: '1234.5678', title: 'Tensor network example', content: 'A tensor network summary.', pdf_url: 'https://arxiv.org/pdf/1234.5678.pdf' }];
    const restored = await post('/api/arxiv/restore', {
      ...credentials, searchQuery: '量子計算', arxivQuery: 'quantum computing', searchMode: 'phrase', papers
    });
    assert.equal(restored.status, 200);
    assert.ok(restored.data.sessionId);

    const answer = await post('/api/chat', {
      ...credentials, chatModel: 'test-model', sessionId: restored.data.sessionId, query: '這篇論文的結果是什麼'
    });
    assert.equal(answer.status, 200);
    assert.match(answer.data.answer, /張量網路/);
    assert.deepEqual(answer.data.sources, []);

    const invalid = await post('/api/arxiv/restore', {
      ...credentials, searchQuery: '量子計算', arxivQuery: 'quantum computing', papers: [{ title: 'missing abstract' }]
    });
    assert.equal(invalid.status, 400);
  } finally {
    server.close();
  }
});
