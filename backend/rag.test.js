const test = require('node:test');
const assert = require('node:assert/strict');
const providers = require('./providers');
const { generateAnswer, inferQuestionType } = require('./rag');

test('question guidance follows the requested task rather than the paper topic', async () => {
  assert.equal(inferQuestionType('RAG與LLM'), 'relationship');
  assert.equal(inferQuestionType('如何提升RAG的精準度'), 'procedure');
  assert.equal(inferQuestionType('說明向量'), 'concept');
  assert.equal(inferQuestionType('RAG的向量切割'), 'concept');

  const original = providers.google.generateAnswer;
  const prompts = [];
  providers.google.generateAnswer = async prompt => {
    prompts.push(prompt);
    return '{"mode":"insufficient"}';
  };
  try {
    for (const query of ['RAG與LLM', '如何提升RAG的精準度', 'RAG的向量切割']) {
      await generateAnswer(query, '[1] An abstract', 'test-key', 'google', 'test-model', true);
    }
    assert.match(prompts[0], /分別說明兩者的角色/);
    assert.match(prompts[1], /可執行的 2 至 3 個步驟/);
    assert.match(prompts[1], /如何衡量成效/);
    assert.match(prompts[2], /並非標準術語/);
    assert.match(prompts[2], /不要把不同操作混成一件事/);
    for (const prompt of prompts) assert.match(prompt, /不能拿同領域但無關的片段湊引用/);
  } finally {
    providers.google.generateAnswer = original;
  }
});

test('the same grounding contract applies to unrelated topics', async () => {
  const original = providers.google.generateAnswer;
  const prompts = [];
  providers.google.generateAnswer = async prompt => {
    prompts.push(prompt);
    return '{"mode":"insufficient"}';
  };
  try {
    await generateAnswer('光合作用', '[1] An abstract', 'test-key', 'google', 'test-model');
    await generateAnswer('排序演算法', '[1] Another abstract', 'test-key', 'google', 'test-model', true);
    assert.equal(prompts.length, 2);
    for (const prompt of prompts) {
      assert.match(prompt, /"mode":"paper"/);
      assert.match(prompt, /"mode":"general"/);
      assert.match(prompt, /"mode":"mixed"/);
      assert.match(prompt, /"mode":"insufficient"/);
      assert.doesNotMatch(prompt, /量子加密|量子糾纏|張量網路/);
    }
    assert.match(prompts[1], /必須先給 overview/);
  } finally {
    providers.google.generateAnswer = original;
  }
});
