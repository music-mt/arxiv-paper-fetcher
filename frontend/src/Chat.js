import React, { useState, useEffect } from 'react';
import { Download, PlusCircle, Send, Loader2, RotateCcw } from 'lucide-react';

export default function Chat({ apiKey, searchQuery, providerConfig, backendUrl, onClear, initialPapers }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [papers, setPapers] = useState(initialPapers || []); // 初始存儲
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // 🌟 核心修正：當 App.js 的資料傳進來時，強制同步到本地狀態
  useEffect(() => {
    if (initialPapers && initialPapers.length > 0) {
      console.log("📡 偵測到新文獻匯入，數量：", initialPapers.length);
      setPapers(initialPapers);
    }
  }, [initialPapers]);

  // 功能：下載所有搜尋過的文獻為 TXT [cite: 1]
  const downloadAllTXT = () => {
    if (papers.length === 0) return alert("目前沒有文獻可供下載");
    
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

  // 功能：追加搜尋新的 10 篇 [cite: 1]
  const fetchMore = async () => {
    setIsLoadingMore(true);
    try {
      const res = await fetch(`${backendUrl}/api/arxiv/more`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery, 
          apiKey, 
          providerId: providerConfig.id,
          embedModel: providerConfig.embedModel,
          start: papers.length // 從目前數量開始往後抓 [cite: 1]
        })
      });
      const data = await res.json();
      if (data.addedPapers && data.addedPapers.length > 0) {
        const updatedPapers = [...papers, ...data.addedPapers];
        setPapers(updatedPapers);
        
        // 加入系統訊息讓使用者知道更新成功
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `📥 **系統更新**：已成功追加抓取 10 篇新論文！\n目前本地知識庫已擴張至 **${updatedPapers.length}** 篇。` 
        }]);
      }
    } catch (err) {
      alert("追加失敗，請檢查網路連線");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 發送訊息
  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          searchQuery, 
          apiKey, 
          query: input, 
          providerId: providerConfig.id, 
          chatModel: providerConfig.chatModel, 
          embedModel: providerConfig.embedModel 
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      alert("對話連線失敗");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      {/* 頂部工具列：三個按鈕樣式完全一致化 */}
      <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">主題：{searchQuery}</h2>
          <p className="text-xs text-blue-600 font-bold flex items-center gap-1 mt-0.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            📚 庫存文獻：{papers.length} 篇
          </p>
        </div>
        
        {/* 按鈕群組 */}
        <div className="flex gap-3">
          <button 
            onClick={fetchMore} 
            disabled={isLoadingMore} 
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-slate-300 transition-all text-sm font-bold shadow-lg shadow-green-100"
          >
            {isLoadingMore ? <Loader2 className="animate-spin" size={18} /> : <PlusCircle size={18} />}
            繼續搜尋 10 篇
          </button>
          
          <button 
            onClick={downloadAllTXT} 
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all text-sm font-bold shadow-lg shadow-slate-200"
          >
            <Download size={18} /> 下載 TXT
          </button>
          
          <button 
            onClick={onClear} 
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-rose-600 border-2 border-rose-100 rounded-xl hover:bg-rose-50 transition-all text-sm font-bold shadow-lg shadow-rose-50"
          >
            <RotateCcw size={18} /> 更換主題
          </button>
        </div>
      </div>

      {/* 聊天區域 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-5 rounded-2xl shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'}`}>
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium animate-pulse ml-2">
            <Loader2 className="animate-spin" size={14} /> 助理正在分析 {papers.length} 篇文獻...
          </div>
        )}
      </div>

      {/* 輸入區 */}
      <div className="p-6 bg-white border-t">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input 
            className="flex-1 p-4 bg-slate-100 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all text-sm font-medium" 
            placeholder="請輸入關於這些論文的提問..." 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
          />
          <button 
            onClick={handleSend} 
            className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}