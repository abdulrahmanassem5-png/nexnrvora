import { useState } from 'react';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Project } from '../../types';

interface TestimonialFormProps {
  project: Project;
  freelancerId: string;
}

export function TestimonialForm({ project, freelancerId }: TestimonialFormProps) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // If already has a review
  if (project.review || submitted) {
    return (
      <div className="bg-slate-900 border border-emerald-500/30 p-8 rounded-2xl text-center shadow-lg shadow-emerald-500/10 mt-8">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">شكراً لتقييمك!</h3>
        <p className="text-gray-400">لقد تم حفظ تقييمك للمشروع بنجاح. نحن نقدر رأيك جداً.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      // 1. Update project with review
      const projRef = doc(db, `freelancers/${freelancerId}/projects/${project.id}`);
      await updateDoc(projRef, {
        review: {
          rating,
          text,
          createdAt: serverTimestamp(),
          isPublic: false
        }
      });

      // 2. Notify freelancer
      await addDoc(collection(db, `freelancers/${freelancerId}/notifications`), {
        title: 'تقييم جديد!',
        message: `قام العميل بتقييم مشروع "${project.title}" ${rating} نجوم.`,
        isRead: false,
        createdAt: serverTimestamp(),
        type: 'review',
        link: `/app/projects/${project.id}`
      });

      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting review:", err);
      alert("حدث خطأ أثناء إرسال التقييم.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-xl mt-8">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">كيف كانت تجربتك؟</h3>
        <p className="text-gray-400">شارك رأيك حول العمل على هذا المشروع لمساعدة المستقل على التطور.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
        {/* Rating Stars */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`w-12 h-12 rounded-full transition-all flex items-center justify-center \${
                rating >= star 
                  ? 'bg-yellow-500/20 text-yellow-500 scale-110' 
                  : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
              }`}
            >
              <svg className="w-8 h-8" fill={rating >= star ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          ))}
        </div>

        <div className="text-center text-sm font-bold text-yellow-500 mb-6">
          {rating === 5 && 'ممتاز! عمل احترافي جداً'}
          {rating === 4 && 'جيد جداً! راضٍ عن النتيجة'}
          {rating === 3 && 'جيد، لكن هناك مجال للتحسين'}
          {rating === 2 && 'مقبول'}
          {rating === 1 && 'سيء'}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">رأيك بالتفصيل</label>
          <textarea
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="اكتب هنا رأيك حول جودة العمل، التواصل، والالتزام بالوقت..."
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              إرسال التقييم
              <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
