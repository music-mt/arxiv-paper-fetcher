import React, { useState } from 'react';
import { Download, PlusCircle, Send, Loader2, RotateCcw } from 'lucide-react';

export default function Chat({ apiKey, searchQuery, providerConfig, backendUrl, onClear, initialPapers }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [papers, setPapers] = useState(initialPapers || []); 
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const downloadAllTXT = () => {
    let content = `arXiv 學術報告\n關鍵字: ${searchQuery}\n總篇數: ${papers.length}\n\n`;
    papers.forEach((p, i) => {
      content += `[${i+1}] ${p.title}\n作者: ${p.authors}\n連結: ${p.pdf_url}\n摘要: ${p.content}\n\n------------------\n\n`;
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arXiv_${searchQuery}_${papers.length}篇.txt`;
    link.click();
  };

  const fetchMore = async () => {
    setIsLoadingMore(true);
    try {
      const res = await fetch(`${backendUrl}/api/arxiv/more`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery, apiKey, providerId: providerConfig.id,
          embedModel: providerConfig.embedModel,
          start: papers.length 
        })
      });
      const data = await res.json();
      if (data.addedPapers && data.addedPapers.length > 0) {
        const updatedPapers = [...papers, ...data.addedPapers];
        setPapers(updatedPapers); // 🌟 更新存儲量，確保 TXT 下載正確 
        
        // 🌟 自動加入系統回饋訊息 
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `📥 **系統訊息**：已成功追加 10 篇論文！目前知識庫共有 ${updatedPapers.length} 篇。您可以繼續提問或下載最新的 TXT 檔。` 
        }]);
      }
    } catch (err) {
      alert("追加失敗");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery, apiKey, query: input, providerId: providerConfig.id, chatModel: providerConfig.chatModel, embedModel: providerConfig.embedModel })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      alert("連線失敗");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      {/* 🌟 頂部工具列：按鈕框架一致性微調  */}
      <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800">主題：{searchQuery}</h2>
          <p className="text-xs text-blue-600 font-bold">📚 庫存文獻：{papers.length} 篇</p>
        </div>
        
        <div className="flex gap-3">
          {/* 按鈕 1: 繼續搜尋 */}
          <button onClick={fetchMore} disabled={isLoadingMore} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-slate-300 transition-all text-sm font-bold shadow-lg shadow-green-100">
            {isLoadingMore ? <Loader2 className="animate-spin" size={18} /> : <PlusCircle size={18} />}
            繼續搜尋 10 篇
          </button>
          
          {/* 按鈕 2: 下載 TXT */}
          <button onClick={downloadAllTXT} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all text-sm font-bold shadow-lg shadow-slate-200">
            <Download size={18} /> 下載 TXT
          </button>
          
          {/* 按鈕 3: 更換主題 (樣式已完全對齊)  */}
          <button onClick={onClear} className="flex items-center gap-2 px-5 py-2.5 bg-white text-rose-600 border-2 border-rose-100 rounded-xl hover:bg-rose-50 transition-all text-sm font-bold shadow-lg shadow-rose-50">
            <RotateCcw size={18} /> 更換主題
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-5 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'}`}>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}
        {isTyping && <div className="text-slate-400 text-xs animate-pulse ml-2">助理正在分析 {papers.length} 篇文獻...</div>}
      </div>

      <div className="p-6 bg-white border-t">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input className="flex-1 p-4 bg-slate-100 rounded-2xl outline-none text-sm font-medium border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all" placeholder="詢問關於這些論文的事..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
          <button onClick={handleSend} className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100">
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}