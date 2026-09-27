import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { ChatMessage, User } from '../../types';
import { sendEmailNotification } from '../../lib/email';

interface ChatBoxProps {
  projectId: string;
  freelancerId: string;
}

export function ChatBox({ projectId, freelancerId }: ChatBoxProps) {
  const { currentUser, role } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser || !projectId || !freelancerId) return;

    const q = query(
      collection(db, `freelancers/${freelancerId}/projects/${projectId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, projectId, freelancerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newMessage.trim() || !role) return;

    const text = newMessage;
    setNewMessage(''); // optimistic clear

    try {
      await addDoc(collection(db, `freelancers/${freelancerId}/projects/${projectId}/messages`), {
        text,
        senderId: currentUser.uid,
        senderRole: role,
        createdAt: serverTimestamp()
      });

      // Phase 2: Send notification if client sends message
      if (role === 'client') {
        await addDoc(collection(db, `freelancers/${freelancerId}/notifications`), {
          title: 'رسالة جديدة من العميل',
          message: text,
          isRead: false,
          type: 'message',
          link: `/app/projects/${projectId}`,
          createdAt: serverTimestamp()
        });

        // Fetch freelancer info to send email
        const freelancerSnap = await getDoc(doc(db, `users/${freelancerId}`));
        if (freelancerSnap.exists()) {
          const freelancerData = freelancerSnap.data() as User;
          await sendEmailNotification({
            to_email: freelancerData.email,
            to_name: freelancerData.displayName || 'المستقل',
            from_name: currentUser.displayName || 'العميل',
            message: `تلقيت رسالة جديدة في مشروعك: "${text}"`,
            subject: 'رسالة جديدة من عميلك - منصة NEXNRVORA',
            action_url: `${window.location.origin}/app/projects/${projectId}`
          });
        }
      } else if (role === 'freelancer') {
        // Fetch project to get clientId
        const projSnap = await getDoc(doc(db, `freelancers/${freelancerId}/projects/${projectId}`));
        if (projSnap.exists()) {
          const projectData = projSnap.data();
          if (projectData.clientId) {
            const clientSnap = await getDoc(doc(db, `freelancers/${freelancerId}/clients/${projectData.clientId}`));
            if (clientSnap.exists()) {
              const clientData = clientSnap.data();
              if (clientData.email) {
                await sendEmailNotification({
                  to_email: clientData.email,
                  to_name: clientData.name || 'العميل',
                  from_name: currentUser.displayName || 'المستقل',
                  message: `تلقيت رسالة جديدة من المستقل: "${text}"`,
                  subject: 'رسالة جديدة من المستقل - منصة NEXNRVORA',
                  action_url: `${window.location.origin}/portal/projects/${projectId}`
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
      // Optional: restore text if failed
    }
  };

  const formatTime = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[500px] bg-slate-950 border border-slate-800/60 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </div>
          <div>
            <h3 className="font-black text-slate-50 text-sm">مساحة النقاش</h3>
            <p className="text-xs font-bold text-slate-400">تواصل مباشر في الوقت الفعلي</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full opacity-60">
            <svg className="w-16 h-16 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p className="font-bold text-slate-400">لا توجد رسائل حتى الآن.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === currentUser?.uid;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-start' : 'items-end'}`}>
                  <span className="text-[10px] font-bold text-slate-400 mb-1 mx-1">
                    {msg.senderRole === 'freelancer' ? 'المستقل' : 'العميل'}
                  </span>
                  <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                    isMe 
                      ? 'bg-indigo-600 text-white rounded-tr-sm shadow-xl shadow-indigo-500/10 shadow-indigo-200' 
                      : 'bg-slate-900 text-slate-200 border border-slate-800/60 rounded-tl-sm shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 mx-1">{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-slate-900 border-t border-slate-800/60">
        <form 
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800/60 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all"
        >
          <input
            type="text"
            className="flex-1 bg-transparent border-none focus:ring-0 px-3 text-sm font-medium text-slate-50"
            placeholder="اكتب رسالة..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="p-3 bg-indigo-600 text-white rounded-xl shadow-xl shadow-indigo-500/10 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 shrink-0"
          >
            <svg className="w-5 h-5 rotate-90 rtl:-rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
