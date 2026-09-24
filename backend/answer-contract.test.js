const test = require('node:test');
const assert = require('node:assert/strict');
const { finalizeAnswer } = require('./answer-contract');

const chunks = [{
  text: 'We compare the method against a baseline and report lower error on the benchmark.',
  metadata: { title: 'Example paper', pdf_url: 'https://arxiv.org/pdf/1234.5678.pdf' }
}];

test('only literal abstract evidence can produce a paper citation', () => {
  const valid = finalizeAnswer(JSON.stringify({ mode: 'paper', claims: [{
    text: '此方法在該基準測試中的誤差較低。', source: 1,
    quote: 'report lower error on the benchmark'
  }] }), chunks);
  assert.equal(valid.grounding, 'paper');
  assert.equal(valid.sources[0].title, 'Example paper');

  const invented = finalizeAnswer(JSON.stringify({ mode: 'paper', claims: [{
    text: '此方法有絕對安全保證。', source: 1,
    quote: 'provides an absolute security guarantee'
  }] }), chunks);
  assert.equal(invented.grounding, 'insufficient');
  assert.deepEqual(invented.sources, []);

  const inventedNumber = finalizeAnswer(JSON.stringify({ mode: 'paper', claims: [{
    text: '此方法提升了 50 倍。', source: 1,
    quote: 'report lower error on the benchmark'
  }] }), chunks);
  assert.equal(inventedNumber.grounding, 'insufficient');
});

test('general answers cannot forge external links or paper citations', () => {
  const general = finalizeAnswer(JSON.stringify({ mode: 'general', answer: '這是一項基本概念。' }), chunks);
  assert.equal(general.grounding, 'general');
  assert.deepEqual(general.sources, []);
  assert.equal(finalizeAnswer(JSON.stringify({ mode: 'general', answer: '參見 [1]' }), chunks).grounding, 'insufficient');
  assert.equal(finalizeAnswer(JSON.stringify({ mode: 'general', answer: '參見 https://example.com' }), chunks).grounding, 'insufficient');
  assert.equal(finalizeAnswer(JSON.stringify({ mode: 'general', answer: '任何系統都保證絕對安全。' }), chunks).grounding, 'insufficient');
  assert.equal(finalizeAnswer(JSON.stringify({ mode: 'general', answer: '一般說明' }), chunks, false).grounding, 'insufficient');
});

test('unstructured model output is not shown as a sourced answer', () => {
  assert.equal(finalizeAnswer('我保證這些論文證明了答案 [1]', chunks).grounding, 'insufficient');
});
