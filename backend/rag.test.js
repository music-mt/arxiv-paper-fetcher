const test = require('node:test');
const assert = require('node:assert/strict');
const providers = require('./providers');
const { generateAnswer } = require('./rag');

test('the same grounding contract applies to unrelated topics', async () => {
  const original = providers.google.generateAnswer;
  const prompts = [];
  providers.google.generateAnswer = async prompt => {
    prompts.push(prompt);
    return '{"mode":"insufficient"}';
  };
  try {
    await generateAnswer('光合作用', '[1] An abstract', 'test-key', 'google', 'test-model');
    await generateAnswer('排序演算法', '[1] Another abstract', 'test-key', 'google', 'test-model');
    assert.equal(prompts.length, 2);
    for (const prompt of prompts) {
      assert.match(prompt, /"mode":"paper"/);
      assert.match(prompt, /"mode":"general"/);
      assert.match(prompt, /"mode":"insufficient"/);
      assert.doesNotMatch(prompt, /量子加密|量子糾纏|張量網路/);
    }
  } finally {
    providers.google.generateAnswer = original;
  }
});
