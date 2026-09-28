import { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Project, Task, Client } from '../../types';

interface AIAssistantProps {
  project: Project;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export function AIAssistant({ project }: AIAssistantProps) {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clientName, setClientName] = useState('غير محدد');

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = useMemo(() => {
    if (!apiKey) return null;
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }, [apiKey]);

  useEffect(() => {
    if (!currentUser || !project) return;
    
    const fetchContextData = async () => {
      try {
        const cSnap = await getDoc(doc(db, `freelancers/${currentUser.uid}/clients/${project.clientId}`));
        if (cSnap.exists()) setClientName(cSnap.data().name);

        const q = query(collection(db, `freelancers/${currentUser.uid}/projects/${project.id}/tasks`));
        const tSnap = await getDocs(q);
        setTasks(tSnap.docs.map(d => d.data() as Task));
      } catch (e) {
        console.error("Error fetching context for AI:", e);
      }
    };
    
    fetchContextData();
  }, [currentUser, project]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const generateContext = () => {
    const tasksSummary = tasks.length > 0 
      ? tasks.map(t => `- ${t.title} (${t.status === 'done' ? 'مكتملة' : t.status === 'in_progress' ? 'قيد التنفيذ' : 'جديدة'})`).join('\n')
      : 'لا توجد مهام حالياً.';

    return `
أنت مساعد ذكي احترافي داخل لوحة تحكم مستقل (Freelancer).
أنت تساعد المستقل في إدارة هذا المشروع.
تفاصيل المشروع الحالي:
- اسم المشروع: ${project.title}
- وصف المشروع: ${project.description}
- اسم العميل: ${clientName}
- حالة المشروع: ${project.status}

قائمة المهام في المشروع:
${tasksSummary}

عليك الإجابة باللغة العربية بأسلوب احترافي ومباشر.
`;
  };

  const sendMessage = async (promptText: string) => {
    if (!promptText.trim()) return;
    if (!apiKey) {
      alert('الرجاء إضافة VITE_GEMINI_API_KEY في ملف .env ليعمل المساعد الذكي.');
      return;
    }

    const newMsg: ChatMessage = { id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`, role: 'user', content: promptText };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    try {
      if (!model) throw new Error("Model not initialized");
      
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      // Create a chat session with system instructions essentially placed in the first message or history
      // Since gemini-1.5-flash supports systemInstructions, we can use it.
      const chat = model.startChat({
        systemInstruction: generateContext(),
        history: history,
      });

      const result = await chat.sendMessage(promptText);
      const responseText = result.response.text();
      
      setMessages(prev => [...prev, { id: `model-${Date.now()}-${Math.random().toString(36).slice(2)}`, role: 'model', content: responseText }]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'model', content: 'حدث خطأ أثناء التواصل مع الذكاء الاصطناعي. تأكد من صحة مفتاح الـ API.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (type: 'proposal' | 'summary') => {
    if (type === 'proposal') {
      sendMessage('اكتب لي عرض سعر احترافي (Proposal) لهذا المشروع بناءً على الوصف والمهام ليتم إرساله للعميل.');
    } else {
      sendMessage('قم بتلخيص حالة المشروع والمهام المتبقية بشكل سريع ومنظم.');
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 hover:scale-110 transition-all z-40 ${isOpen ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100'}`}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>

      {/* Chat Sidebar / Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[400px] bg-slate-900 shadow-[-10px_0_40px_rgba(0,0,0,0.1)] z-50 transform transition-transform duration-500 flex flex-col border-l border-slate-800/60 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/10">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-black text-slate-50">NEXNRVORA الذكي</h3>
              <p className="text-xs font-bold text-slate-400">مساعدك الشخصي للمشروع</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-300 bg-slate-800 hover:bg-slate-800 p-2 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-950/30">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
              <div className="w-16 h-16 mb-4 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 rotate-12">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h4 className="font-bold text-slate-200 mb-2">كيف يمكنني مساعدتك اليوم؟</h4>
              <p className="text-sm text-slate-400 max-w-[250px]">أنا مطلع على تفاصيل هذا المشروع ومهامه، اسألني ما تشاء!</p>
              
              <div className="mt-8 flex flex-col gap-3 w-full max-w-[280px]">
                <button onClick={() => handleQuickAction('proposal')} className="bg-slate-900 border border-indigo-100 p-3 rounded-xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 text-sm font-bold text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-300 transition-all flex items-center justify-center gap-2">
                  <span>✨</span> كتابة عرض سعر
                </button>
                <button onClick={() => handleQuickAction('summary')} className="bg-slate-900 border border-emerald-100 p-3 rounded-xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 text-sm font-bold text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-300 transition-all flex items-center justify-center gap-2">
                  <span>📊</span> تلخيص المهام
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tl-sm shadow-xl shadow-indigo-500/10 shadow-indigo-200' 
                      : 'bg-slate-900 text-slate-200 border border-slate-800/60 rounded-tr-sm shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800/60 p-4 rounded-2xl rounded-tr-sm shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-150"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          {!apiKey && (
            <div className="mb-3 text-xs font-bold text-rose-400 bg-rose-500/10 p-2 rounded-lg text-center border border-rose-100">
              يرجى إضافة مفتاح VITE_GEMINI_API_KEY في ملف .env
            </div>
          )}
          <form 
            onSubmit={e => {
              e.preventDefault();
              sendMessage(input);
            }} 
            className="flex items-end gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800/60 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all"
          >
            <textarea
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-3 text-sm font-medium text-slate-50"
              placeholder="اسألني عن المشروع..."
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
              className="p-3 bg-indigo-600 text-white rounded-xl shadow-xl shadow-indigo-500/10 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 shrink-0 m-1"
            >
              <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          className="fixed inset-0 bg-indigo-600/20 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}
    </>
  );
}
