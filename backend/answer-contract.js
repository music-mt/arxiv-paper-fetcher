const normalize = text => text.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
const validText = (text, maxLength) => typeof text === 'string' && text.trim().length > 0 &&
  text.length <= maxLength && !/https?:\/\/|www\.|\[[^\]]*\d[^\]]*\]|\*\*/i.test(text);
const validGeneralText = text => validText(text, 600) &&
  !/(絕對|保證|永遠|無條件|毫無風險|立即偵測|任何.{0,8}都|所有.{0,8}都)/.test(text);

const parseModelJson = raw => {
  if (typeof raw !== 'string') return null;
  const content = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(content); } catch { return null; }
};

const insufficient = () => ({
  grounding: 'insufficient',
  answer: '目前這批論文摘要不足以可靠回答這個問題。請嘗試更精確的搜尋主題，或針對某篇論文提問。',
  sources: []
});

const finalizeAnswer = (raw, chunks, allowGeneral = true, requireOverview = false) => {
  const result = parseModelJson(raw);
  if (!result || typeof result !== 'object') return insufficient();
  if (result.mode === 'general' && allowGeneral && validGeneralText(result.answer)) {
    return {
      grounding: 'general',
      answer: `一般說明（未經這批論文摘要驗證）\n${result.answer.trim()}`,
      sources: []
    };
  }
  if (!['paper', 'mixed'].includes(result.mode) || !Array.isArray(result.claims)) return insufficient();

  const overview = result.mode === 'mixed' && allowGeneral && validGeneralText(result.overview)
    ? result.overview.trim() : null;
  if (result.mode === 'mixed' && allowGeneral && !overview) return insufficient();
  if (requireOverview && !overview) return insufficient();

  const supported = result.claims.slice(0, 4).flatMap(claim => {
    if (!claim || !Number.isInteger(claim.source) || claim.source < 1 || claim.source > chunks.length ||
        !validText(claim.text, 500) || typeof claim.quote !== 'string' || claim.quote.trim().length < 12) return [];
    const paper = chunks[claim.source - 1];
    if (!normalize(paper.text).includes(normalize(claim.quote))) return [];
    const claimedNumbers = claim.text.match(/\d+(?:\.\d+)?/g) || [];
    if (claimedNumbers.some(number => !claim.quote.includes(number))) return [];
    return [{ text: claim.text.trim(), number: claim.source, paper: paper.metadata }];
  });
  if (supported.length === 0) {
    return overview ? {
      grounding: 'general',
      answer: `一般說明（未經這批論文摘要驗證）\n${overview}`,
      sources: []
    } : insufficient();
  }

  const cited = [...new Set(supported.map(claim => claim.number))];
  return {
    grounding: overview ? 'mixed' : 'paper',
    answer: `${overview ? `一般說明（未經這批論文摘要驗證）\n${overview}\n\n這批論文中的例子\n` : ''}${supported.map(claim => `${claim.text} [${claim.number}]`).join('\n\n')}`,
    sources: cited.map(number => ({
      number,
      title: chunks[number - 1].metadata.title,
      url: /^https:\/\/arxiv\.org\/pdf\//.test(chunks[number - 1].metadata.pdf_url || '')
        ? chunks[number - 1].metadata.pdf_url : null
    }))
  };
};

module.exports = { finalizeAnswer };
