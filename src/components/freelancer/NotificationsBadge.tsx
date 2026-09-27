import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import type { Notification } from '../../types';

export function NotificationsBadge() {
  const { currentUser, role } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only freelancers get notifications in this MVP
    if (!currentUser || role !== 'freelancer') return;

    const q = query(
      collection(db, `freelancers/${currentUser.uid}/notifications`),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach(doc => {
        notifs.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentUser, role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (notificationId: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, `freelancers/${currentUser.uid}/notifications/${notificationId}`), {
        isRead: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (role !== 'freelancer') return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-slate-800 transition-colors relative text-slate-400 hover:text-white"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-indigo-500/20 z-50 overflow-hidden origin-top-left">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <h3 className="font-bold text-white">الإشعارات</h3>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-full font-medium">
              {unreadCount} جديد
            </span>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                لا توجد إشعارات حالياً
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => {
                      if (!notif.isRead) markAsRead(notif.id);
                    }}
                    className={`p-4 hover:bg-slate-800/50 transition-colors cursor-pointer ${notif.isRead ? 'opacity-60' : 'bg-indigo-500/5'}`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-1">
                        {notif.type === 'message' ? (
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">💬</div>
                        ) : notif.type === 'review' ? (
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">⭐</div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">⚡</div>
                        )}
                      </div>
                      <div>
                        <h4 className={`text-sm ${notif.isRead ? 'font-medium text-slate-300' : 'font-bold text-white'}`}>
                          {notif.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{notif.message}</p>
                        {notif.link && (
                          <Link 
                            to={notif.link}
                            className="text-indigo-400 hover:text-indigo-300 text-xs mt-2 inline-block font-medium"
                          >
                            عرض التفاصيل &rarr;
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
