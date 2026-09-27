import { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { collection, query, getDocs, doc, setDoc, updateDoc, serverTimestamp, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Task } from '../../types';

interface KanbanBoardProps {
  projectId: string;
}

const COLUMNS = {
  todo: { id: 'todo', title: 'مهام جديدة', color: 'bg-slate-800', dot: 'bg-slate-400' },
  in_progress: { id: 'in_progress', title: 'قيد التنفيذ', color: 'bg-indigo-500/10', dot: 'bg-indigo-500' },
  done: { id: 'done', title: 'مكتملة', color: 'bg-emerald-500/10', dot: 'bg-emerald-500' }
};

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  // Timer State
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchTasks = async () => {
      try {
        const q = query(
          collection(db, `freelancers/${currentUser.uid}/projects/${projectId}/tasks`),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(q);
        setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[]);
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();

    return () => { stopTimer(); }; // Cleanup on unmount
  }, [currentUser, projectId]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !currentUser) return;

    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistic UI update
    const newTasks = Array.from(tasks);
    const movedTask = newTasks.find(t => t.id === draggableId);
    if (!movedTask) return;

    movedTask.status = destination.droppableId as Task['status'];
    setTasks([...newTasks]);

    // DB Update
    try {
      await updateDoc(doc(db, `freelancers/${currentUser.uid}/projects/${projectId}/tasks/${draggableId}`), {
        status: destination.droppableId
      });
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !currentUser) return;
    
    const tempId = Date.now().toString();
    const newTask: Task = {
      id: tempId,
      projectId,
      title: newTaskTitle,
      status: 'todo',
      timeSpent: 0,
      createdAt: new Date()
    };
    
    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');

    try {
      const docRef = doc(collection(db, `freelancers/${currentUser.uid}/projects/${projectId}/tasks`));
      await setDoc(docRef, {
        ...newTask,
        id: docRef.id,
        createdAt: serverTimestamp()
      });
      setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: docRef.id } : t));
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!currentUser || !window.confirm('حذف المهمة؟')) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    
    try {
      await deleteDoc(doc(db, `freelancers/${currentUser.uid}/projects/${projectId}/tasks/${taskId}`));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  // Timer Logic
  const stopTimer = async () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    if (activeTimerId && currentUser) {
      // Save current timeSpent to DB
      const currentTask = tasks.find(t => t.id === activeTimerId);
      if (currentTask) {
        try {
          await updateDoc(doc(db, `freelancers/${currentUser.uid}/projects/${projectId}/tasks/${activeTimerId}`), {
            timeSpent: currentTask.timeSpent
          });
        } catch (e) {
          console.error("Error saving time:", e);
        }
      }
    }
    setActiveTimerId(null);
  };

  const toggleTimer = async (taskId: string) => {
    if (activeTimerId === taskId) {
      await stopTimer();
    } else {
      if (activeTimerId) await stopTimer(); // Stop previous
      
      setActiveTimerId(taskId);
      timerIntervalRef.current = window.setInterval(() => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, timeSpent: (t.timeSpent || 0) + 1 } : t));
      }, 1000);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="py-20 text-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black text-slate-50">مهام المشروع (Kanban)</h3>
        <div className="bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-xl font-bold text-sm">
          إجمالي الوقت المسجل: {formatTime(tasks.reduce((acc, t) => acc + (t.timeSpent || 0), 0))}
        </div>
      </div>

      <form onSubmit={addTask} className="mb-8 flex gap-3">
        <input
          type="text"
          placeholder="أضف مهمة جديدة..."
          className="flex-1 p-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
        />
        <button type="submit" className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-xl shadow-indigo-500/10 hover:bg-indigo-700 transition-colors shrink-0">
          إضافة
        </button>
      </form>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {Object.values(COLUMNS).map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            
            return (
              <div key={col.id} className="w-full md:w-1/3">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                  <h4 className="font-bold text-slate-200">{col.title} <span className="text-slate-400 font-medium ml-1 text-sm">({colTasks.length})</span></h4>
                </div>
                
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      className={`min-h-[200px] p-3 rounded-2xl transition-colors ${col.color} ${snapshot.isDraggingOver ? 'ring-2 ring-indigo-300 ring-inset' : ''}`}
                    >
                      {colTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-slate-900 p-4 rounded-xl border border-slate-800 mb-3 group transition-shadow ${snapshot.isDragging ? 'shadow-xl shadow-indigo-100 scale-105 z-50' : 'shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 hover:shadow-xl shadow-indigo-500/10'}`}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <h5 className="font-bold text-slate-50 leading-snug break-words pr-2">{task.title}</h5>
                                <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                              
                              <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-2">
                                <div className="text-xs font-bold text-slate-400 font-mono tracking-wider">
                                  {formatTime(task.timeSpent || 0)}
                                </div>
                                <button
                                  onClick={() => toggleTimer(task.id)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    activeTimerId === task.id 
                                    ? 'bg-rose-100 text-rose-700 animate-pulse' 
                                    : 'bg-slate-800 text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400'
                                  }`}
                                >
                                  {activeTimerId === task.id ? (
                                    <>
                                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                                      إيقاف
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                      بدء
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
