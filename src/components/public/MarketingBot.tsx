import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export function MarketingBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const generateContext = () => {
    return `
أنت خبير تسويق رقمي ومتخصص في تحسين محركات البحث (SEO).
أنت تعمل كمساعد ذكي في الصفحة الرئيسية لمنصة "NEXNRVORA"، وهي منصة عالمية لإدارة المشاريع والفواتير للمستقلين (Freelancers).
هدفك هو:
1. إقناع الزوار (المستقلين) بأهمية التسجيل في المنصة لإدارة أعمالهم باحترافية.
2. مساعدة المستقلين في كتابة محتوى إعلاني جذاب لخدماتهم.
3. استخراج كلمات مفتاحية (Hashtags و SEO Keywords) مخصصة لمجالاتهم عند الطلب.
عليك الإجابة باللغة العربية بأسلوب احترافي ومحفز ومباشر.
`;
  };

  const sendMessage = async (promptText: string) => {
    if (!promptText.trim()) return;
    if (!apiKey) {
      alert('الرجاء إضافة VITE_GEMINI_API_KEY في ملف .env ليعمل المساعد الذكي.');
      return;
    }

    const newMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: promptText };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: generateContext()
      });
      
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const chat = model.startChat({
        history: history,
      });

      const result = await chat.sendMessage(promptText);
      const responseText = result.response.text();
      
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: responseText }]);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      const errMsg = error?.message || String(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: `عذراً، حدث خطأ: ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (type: 'ad' | 'seo') => {
    if (type === 'ad') {
      sendMessage('أنا مصمم جرافيك وأريد كتابة إعلان قصير لجذب العملاء على تويتر، هل يمكنك مساعدتي؟');
    } else {
      sendMessage('أعطني أفضل الكلمات المفتاحية (SEO) لمستقل يعمل في مجال كتابة المحتوى.');
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-[0_0_20px_rgba(139,92,246,0.5)] flex items-center justify-center hover:scale-110 transition-all z-40 ${isOpen ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100'}`}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>

      {/* Chat Sidebar / Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[400px] bg-slate-900 shadow-[-10px_0_40px_rgba(0,0,0,0.3)] z-50 transform transition-transform duration-500 flex flex-col border-l border-white/10 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-black text-white">المسوق الذكي</h3>
              <p className="text-xs font-bold text-gray-400">مساعدك للنمو والمبيعات</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-900/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-90">
              <div className="w-16 h-16 mb-4 rounded-3xl bg-blue-500/20 flex items-center justify-center text-blue-400 rotate-12">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <h4 className="font-bold text-white mb-2">مرحباً بك في NEXNRVORA!</h4>
              <p className="text-sm text-gray-400 max-w-[250px]">أنا خبير تسويق ذكي، يمكنني مساعدتك في كتابة إعلانات لخدماتك أو اقتراح كلمات مفتاحية (SEO).</p>
              
              <div className="mt-8 flex flex-col gap-3 w-full max-w-[280px]">
                <button onClick={() => handleQuickAction('ad')} className="bg-slate-800 border border-blue-500/30 p-3 rounded-xl text-sm font-bold text-blue-400 hover:bg-blue-500/10 transition-all flex items-center justify-center gap-2">
                  <span>✨</span> كتابة إعلان ترويجي
                </button>
                <button onClick={() => handleQuickAction('seo')} className="bg-slate-800 border border-purple-500/30 p-3 rounded-xl text-sm font-bold text-purple-400 hover:bg-purple-500/10 transition-all flex items-center justify-center gap-2">
                  <span>📈</span> اقتراح كلمات SEO مفتاحية
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tl-sm shadow-lg shadow-blue-500/20' 
                      : 'bg-slate-800 text-gray-200 border border-white/5 rounded-tr-sm shadow-lg'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 border border-white/5 p-4 rounded-2xl rounded-tr-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-150"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-slate-950">
          {!apiKey && (
            <div className="mb-3 text-xs font-bold text-red-400 bg-red-500/10 p-2 rounded-lg text-center border border-red-500/20">
              يرجى إضافة مفتاح VITE_GEMINI_API_KEY في ملف .env
            </div>
          )}
          <form 
            onSubmit={e => {
              e.preventDefault();
              sendMessage(input);
            }} 
            className="flex items-end gap-2 bg-slate-900 p-1.5 rounded-2xl border border-white/10 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all"
          >
            <textarea
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-3 text-sm font-medium text-white"
              placeholder="اكتب استفسارك التسويقي..."
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0 m-1"
            >
              <svg className="w-5 h-5 rotate-90 rtl:-rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
      
      {/* Backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}
    </>
  );
}
