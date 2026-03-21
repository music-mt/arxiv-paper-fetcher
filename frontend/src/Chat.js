import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, Mic, MicOff, Volume2, VolumeX, Loader2, Download } from 'lucide-react';

// 🌟 關鍵在這裡：這行 export default 絕對不能漏掉
export default function Chat({ apiKey, searchQuery, providerConfig, backendUrl, onClear }) {
  const [messages, setMessages] = useState([{ role: 'ai', text: `學術大腦已就緒！已為您載入關於「${searchQuery}」的最新論文。請問有什麼想了解的？` }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const endRef = useRef(null);

  const speak = (text) => {
    if (isMuted) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-TW';
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('瀏覽器不支援語音辨識');
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-TW';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => { setInput(e.results[0][0].transcript); setIsListening(false); };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;
    const query = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setLoading(true);

    try {
      const res = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery, apiKey, query, providerId: providerConfig.id, embedModel: providerConfig.embedModel, chatModel: providerConfig.chatModel })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'ai', text: data.answer }]);
      speak(data.answer); 
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: `發生錯誤: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const downloadChat = () => {
    const content = messages.map(m => `${m.role === 'user' ? '提問' : 'AI助理'}: ${m.text}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `arXiv_研究筆記_${searchQuery}.txt`;
    link.click();
  };

  const handleClear = async () => {
    window.speechSynthesis.cancel();
    try {
      await fetch(`${backendUrl}/api/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery })
      });
    } catch (e) {
      console.log('清除記憶體失敗', e);
    }
    onClear();
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col p-4">
      <div className="max-w-4xl w-full mx-auto bg-white rounded-3xl shadow-xl flex flex-col overflow-hidden h-full border border-slate-200">
        
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <FileText />
            <h1 className="font-bold tracking-wide">arXiv 學術助理</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setIsMuted(!isMuted); window.speechSynthesis.cancel(); }} className="p-2 hover:bg-white/20 rounded-full transition">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button onClick={downloadChat} className="flex items-center gap-1 bg-blue-500 px-3 py-1.5 rounded-full text-xs hover:bg-blue-400 transition shadow-sm">
              <Download size={14} /> 匯出筆記
            </button>
            <button onClick={handleClear} className="text-xs bg-slate-700 px-3 py-1.5 rounded-full hover:bg-slate-800 transition shadow-sm">
              更換主題
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && <div className="text-blue-500 text-sm flex gap-2"><Loader2 className="animate-spin" size={16}/>正在查閱文獻...</div>}
          <div ref={endRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 border-t flex gap-3 items-center bg-white">
          <button type="button" onClick={startListening} className={`p-3 rounded-full transition-all shadow-sm ${isListening ? 'bg-red-500 text-white animate-bounce' : 'bg-slate-100 text-blue-600 hover:bg-slate-200'}`}>
            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          <input className="flex-1 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" value={input} onChange={e => setInput(e.target.value)} placeholder={isListening ? "正在傾聽..." : "輸入您的學術問題..."} />
          <button type="submit" className="p-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-all">
            <Send size={24} />
          </button>
        </form>
      </div>
    </div>
  );
}