// Short, reviewed explanations for concepts that are often misrepresented by analogies.
// These are general references, never presented as evidence from the current arXiv session.
const CONCEPTS = {
  '張量網路': {
    answer: '張量網路把一個大型多維資料結構表示為互相連接的較小張量，計算時依序「收縮」連線。例子是矩陣乘積態：它可以有效近似某些糾纏程度有限的一維量子系統。效率取決於連線的維度（bond dimension）與所需精度；不是任何 50 量子位元系統都能在一般電腦上輕鬆模擬。這是一般概念說明，不是目前這批論文的結論。',
    sources: [{ title: 'IBM Quantum：矩陣乘積態模擬與精度', url: 'https://quantum.cloud.ibm.com/docs/tutorials/transverse-field-ising-model' }]
  },
  '量子糾纏': {
    answer: '量子糾纏是多個量子系統具有無法分解成各自獨立狀態的聯合狀態。例子是兩個量子位元處於 (|00⟩ + |11⟩)/√2：在相同基底測量時，各自結果隨機，但兩者結果相關。事先配好左右手套只是古典相關，不能完整類比量子糾纏；糾纏也不能用來超光速傳訊。這是一般概念說明，不是目前這批論文的結論。',
    sources: [{ title: 'IBM Quantum：糾纏與古典相關的差異', url: 'https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/entanglement-in-action/introduction' }]
  },
  '量子加密': {
    answer: '「量子加密」常泛指利用量子技術保護通訊；其中量子金鑰分發（QKD）是建立共享密鑰，資料本身通常仍由其他加密方法處理。通訊雙方可透過抽樣比對等步驟估計竊聽造成的異常，但不是一被偷看就立即得知，也不能保證實際設備絕對安全；安全性取決於協定、驗證、裝置及實作條件。這是一般概念說明，不是目前這批論文的結論。',
    sources: [{ title: 'NIST：量子密碼學及 QKD 的限制', url: 'https://www.nist.gov/cybersecurity-and-privacy/what-quantum-cryptography' }]
  },
  '量子演算法': {
    answer: '量子演算法利用量子閘、干涉與測量等步驟解決特定計算問題；它不是把所有答案同時讀出，也不保證每個問題都比傳統演算法快。例子是 Grover 搜尋：對有合適判定程序的無序搜尋，在查詢模型中約需 O(√N) 次查詢，而傳統方法需 O(N) 次。實際速度還取決於判定程序、硬體雜訊與額外成本。這是一般概念說明，不是目前這批論文的結論。',
    sources: [{ title: 'IBM Quantum：Grover 演算法的查詢複雜度', url: 'https://quantum.cloud.ibm.com/learning/en/courses/fundamentals-of-quantum-algorithms/grover-algorithm/concluding-remarks' }]
  }
};

const getConcept = query => {
  const term = query.replace(/\s+/g, '').replace(/^(說明|介紹|解釋)/, '');
  return CONCEPTS[term] || null;
};

module.exports = { getConcept };
