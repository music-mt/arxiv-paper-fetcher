import React, { useState } from 'react';
import Chat from './Chat';
import { FileText } from 'lucide-react';

const PROVIDER_OPTIONS = [
  { id: 'google', name: 'Google AI (Gemini)', embedModel: 'gemini-embedding-001', chatModel: 'gemini-2.0-flash' },
  { id: 'openai', name: 'Open AI (ChatGPT)', embedModel: 'text-embedding-3-small', chatModel: 'gpt-4o-mini' },
  { id: 'xai', name: 'xAI (Grok)', embedModel: 'v1', chatModel: 'grok-beta' },
  { id: 'anthropic', name: 'Anthropic (Claude) - 僅支援對話', embedModel: '', chatModel: 'claude-3-haiku-20240307' }
];

export default function App() {
  const [provider, setProvider] = useState(PROVIDER_OPTIONS[0]);
  const [apiKey, setApiKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('Machine Learning');
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = window.location.hostname === 'localhost' ? 'http://localhost:5001' : 'https://arxiv-paper-fetcher.onrender.com';

  const handleInit = async () => {
    if (provider.id === 'anthropic') return alert("Anthropic 不支援 Embedding，請先選擇 OpenAI 或 Google 進行初始化！");
    
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/arxiv/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery, apiKey, providerId: provider.id, embedModel: provider.embedModel })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsReady(true);
    } catch (err) {
      alert(`❌ 錯誤: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="flex flex-col items-center mb-6 text-slate-800">
            <FileText size={48} className="mb-4 text-blue-600" />
            <h2 className="text-2xl font-bold tracking-wider">arXiv 學術導航者</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">選擇 AI 平台</label>
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={provider.id} onChange={e => setProvider(PROVIDER_OPTIONS.find(p => p.id === e.target.value))}>
                {PROVIDER_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">API Key</label>
              <input type="password" placeholder="輸入金鑰..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={apiKey} onChange={e => setApiKey(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">論文搜尋關鍵字</label>
              <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <button onClick={handleInit} disabled={loading || !apiKey} className="w-full py-4 mt-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-md">
              {loading ? '正在抓取並解析 arXiv...' : '開始學術探索'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Chat apiKey={apiKey} searchQuery={searchQuery} providerConfig={provider} backendUrl={BACKEND_URL} onClear={() => setIsReady(false)} />;
}