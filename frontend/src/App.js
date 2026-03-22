import React, { useState } from 'react';
import Chat from './Chat';
import { FileText, Loader2, Sparkles } from 'lucide-react';

// 定義四大 AI 平台選項
const PROVIDER_OPTIONS = [
  { id: 'google', name: 'Google AI (Gemini)', embedModel: 'gemini-embedding-001', chatModel: 'gemini-2.0-flash' },
  { id: 'openai', name: 'Open AI (ChatGPT)', embedModel: 'text-embedding-3-small', chatModel: 'gpt-4o-mini' },
  { id: 'xai', name: 'xAI (Grok)', embedModel: 'v1', chatModel: 'grok-beta' },
  { id: 'anthropic', name: 'Anthropic (Claude) - 僅支援對話', embedModel: '', chatModel: 'claude-3-haiku-20240307' }
];

export default function App() {
  const [provider, setProvider] = useState(PROVIDER_OPTIONS[0]);
  const [apiKey, setApiKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('Deep Learning');
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🌟 自動偵測環境：若在本機執行則連到 5001，若在雲端則連到 Render
  const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001' 
    : 'https://arxiv-paper-fetcher.onrender.com';

  const handleInit = async () => {
    if (provider.id === 'anthropic') {
      return alert("⚠️ Anthropic 官方目前不提供原生 Embedding API，請先選擇 Google 或 OpenAI 進行測試！");
    }
    
    if (!apiKey) return alert("請輸入 API Key！");

    setLoading(true);
    console.log(`🚀 正在連線至後端: ${BACKEND_URL}/api/arxiv/init`);

    try {
      const res = await fetch(`${BACKEND_URL}/api/arxiv/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          searchQuery, 
          apiKey, 
          providerId: provider.id, 
          embedModel: provider.embedModel 
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '後端初始化失敗');
      }

      console.log('✅ 初始化成功:', data);
      setIsReady(true);
    } catch (err) {
      console.error('❌ 連線錯誤:', err);
      alert(`連線失敗: ${err.message}\n請確認後端伺服器 (Port 5001) 是否已啟動？`);
    } finally {
      setLoading(false);
    }
  };

  // --- 介面渲染：初始化畫面 ---
  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-100 relative overflow-hidden">
          {/* 裝飾背景 */}
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={120} />
          </div>

          <div className="flex flex-col items-center mb-8 relative z-10">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-200 mb-4">
              <FileText size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">arXiv 導航者</h2>
            <p className="text-slate-500 mt-2 text-sm">2026 高速 RAG 學術助理</p>
          </div>
          
          <div className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">AI 平台</label>
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer" 
                value={provider.id} 
                onChange={e => setProvider(PROVIDER_OPTIONS.find(p => p.id === e.target.value))}
              >
                {PROVIDER_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">API Key</label>
              <input 
                type="password" 
                placeholder="貼上您的金鑰..." 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)} 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">搜尋關鍵字 (如: LLM)</label>
              <input 
                type="text" 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
            
            <button 
              onClick={handleInit} 
              disabled={loading} 
              className="w-full py-4 mt-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:bg-slate-300 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  正在抓取與向量化...
                </>
              ) : '開始學術探索'}
            </button>

            <p className="text-center text-[10px] text-slate-400 mt-4">
              連線目標: <span className="font-mono bg-slate-100 px-1 rounded">{BACKEND_URL}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- 介面渲染：進入對話畫面 ---
  return (
    <Chat 
      apiKey={apiKey} 
      searchQuery={searchQuery} 
      providerConfig={provider} 
      backendUrl={BACKEND_URL} 
      onClear={() => setIsReady(false)} 
    />
  );
}