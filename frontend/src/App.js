import React, { useState } from 'react';
import Chat from './Chat';
import { FileText, Loader2, Sparkles, Globe } from 'lucide-react';

// 🌟 完整的四大平台配置
const PROVIDER_OPTIONS = [
  { id: 'google', name: 'Google AI (Gemini)', embedModel: 'gemini-embedding-001', chatModel: 'gemini-2.0-flash' },
  { id: 'openai', name: 'Open AI (ChatGPT)', embedModel: 'text-embedding-3-small', chatModel: 'gpt-4o-mini' },
  { id: 'xai', name: 'xAI (Grok)', embedModel: 'v1', chatModel: 'grok-beta' },
  { id: 'anthropic', name: 'Anthropic (Claude)', embedModel: '', chatModel: 'claude-3-haiku-20240307' }
];

export default function App() {
  const [provider, setProvider] = useState(PROVIDER_OPTIONS[0]);
  const [apiKey, setApiKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('Deep Learning'); // 預設關鍵字
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialPapers, setInitialPapers] = useState([]);

  const BACKEND_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5001' 
    : 'https://arxiv-paper-fetcher.onrender.com';

  const handleInit = async () => {
    // Anthropic 暫時不支援向量化邏輯的阻擋
    if (provider.id === 'anthropic') {
      return alert("⚠️ Anthropic 目前不支援原生 Embedding API，請先選擇 Google 或 OpenAI 進行向量化測試！");
    }
    
    if (!apiKey) return alert("請輸入您的 API Key！");
    if (!searchQuery) return alert("請輸入搜尋關鍵字！");

    setLoading(true);
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
      if (res.ok) {
        setInitialPapers(data.papers);
        setIsReady(true);
      } else {
        alert(data.error || "初始化失敗");
      }
    } catch (err) {
      alert("連線後端失敗，請確認伺服器是否啟動？");
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 bg-blue-50 w-32 h-32 rounded-full opacity-50"></div>
          
          <div className="flex flex-col items-center mb-10 relative z-10">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-200 mb-4">
              <Sparkles size={32} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">arXiv 導航者</h2>
            <p className="text-slate-400 text-sm mt-1">2026 高速學術 RAG 引擎</p>
          </div>
          
          <div className="space-y-6 relative z-10">
            {/* 平台選擇 */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1">AI 平台商</label>
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer font-medium text-slate-700" 
                value={provider.id} 
                onChange={e => setProvider(PROVIDER_OPTIONS.find(p => p.id === e.target.value))}
              >
                {PROVIDER_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
            </div>
            
            {/* API KEY */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1">API Key</label>
              <input 
                type="password" 
                placeholder="貼上金鑰..." 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)} 
              />
            </div>
            
            {/* 搜尋關鍵字 */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1">輸入關鍵字 (例如: LLM)</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="輸入搜尋主題..." 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-blue-600" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
                <Globe className="absolute right-4 top-4 text-slate-300" size={20} />
              </div>
            </div>
            
            <button 
              onClick={handleInit} 
              disabled={loading} 
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 disabled:bg-slate-300 transition-all shadow-2xl shadow-blue-100 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  正在內化文獻...
                </>
              ) : '開始學術探索'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Chat 
      apiKey={apiKey} 
      searchQuery={searchQuery} 
      providerConfig={provider} 
      backendUrl={BACKEND_URL} 
      initialPapers={initialPapers} 
      onClear={() => {
        setInitialPapers([]);
        setIsReady(false);
      }} 
    />
  );
}