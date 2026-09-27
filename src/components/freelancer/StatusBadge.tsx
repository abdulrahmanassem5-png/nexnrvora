export function StatusBadge({ status }: { status: 'in_progress' | 'in_review' | 'delivered' }) {
  const statusConfig = {
    in_progress: { label: 'جاري التنفيذ', color: 'bg-amber-500/10 text-amber-400 border-amber-200/60' },
    in_review: { label: 'مراجعة', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-200/60' },
    delivered: { label: 'تم التسليم', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-200/60' },
  };

  const config = statusConfig[status];

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${config.color} flex items-center gap-1.5 w-max`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.color.split(' ')[1].replace('text', 'bg')}`} />
      {config.label}
    </span>
  );
}
