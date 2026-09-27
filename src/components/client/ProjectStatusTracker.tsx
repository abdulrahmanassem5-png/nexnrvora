interface StatusTrackerProps {
  status: 'in_progress' | 'in_review' | 'delivered';
}

export function ProjectStatusTracker({ status }: StatusTrackerProps) {
  const steps = [
    { id: 'in_progress', label: 'جاري التنفيذ' },
    { id: 'in_review', label: 'مراجعة' },
    { id: 'delivered', label: 'تم التسليم' }
  ];

  const currentIndex = steps.findIndex(s => s.id === status);

  return (
    <div className="flex items-center justify-between w-full relative">
      {/* Background Line */}
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -z-10 -translate-y-1/2" />
      
      {/* Active Line */}
      <div 
        className="absolute top-1/2 right-0 h-1 bg-blue-600 -z-10 -translate-y-1/2 transition-all duration-500" 
        style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
      />

      {steps.map((step, index) => {
        const isCompleted = index <= currentIndex;
        const isActive = index === currentIndex;
        
        return (
          <div key={step.id} className="flex flex-col items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white transition-colors duration-300
                ${isCompleted ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'}`}
            >
              {isCompleted ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-xs font-bold">{index + 1}</span>
              )}
            </div>
            <span className={`text-sm mt-2 font-medium ${isActive ? 'text-blue-400' : 'text-gray-500'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
