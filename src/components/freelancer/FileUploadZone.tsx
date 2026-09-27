import { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface FileUploadZoneProps {
  projectId: string;
  onUploadSuccess: () => void;
}

export function FileUploadZone({ projectId, onUploadSuccess }: FileUploadZoneProps) {
  const { currentUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentUser) return;

    setUploading(true);
    setProgress(0);
    setErrorMsg('');

    const fileArray = Array.from(files);
    
    let completedFiles = 0;
    
    // Estimate total size to calculate overall progress
    const totalBytes = fileArray.reduce((acc, file) => acc + file.size, 0);
    let loadedBytes = 0;

    try {
      const uploadPromises = fileArray.map((file) => {
        return new Promise<void>((resolve, reject) => {
          const fileRef = ref(storage, `freelancers/${currentUser.uid}/projects/${projectId}/${Date.now()}_${file.name}`);
          const uploadTask = uploadBytesResumable(fileRef, file);
          
          let lastBytesTransferred = 0;

          uploadTask.on('state_changed', 
            (snapshot) => {
              const currentBytes = snapshot.bytesTransferred;
              loadedBytes += (currentBytes - lastBytesTransferred);
              lastBytesTransferred = currentBytes;
              
              const p = (loadedBytes / totalBytes) * 100;
              setProgress(p);
            }, 
            (error) => {
              console.error("Upload failed for file", file.name, error);
              reject(error);
            }, 
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                
                // Write to firestore
                await addDoc(collection(db, `freelancers/${currentUser.uid}/projects/${projectId}/files`), {
                  name: file.name,
                  url: downloadURL,
                  type: file.type || 'unknown',
                  size: file.size,
                  uploadedAt: serverTimestamp()
                });
                
                completedFiles++;
                resolve();
              } catch (err) {
                reject(err);
              }
            }
          );
        });
      });

      await Promise.all(uploadPromises);
      
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess();
      
    } catch (err: any) {
      console.error("Error during batch upload:", err);
      setErrorMsg('فشل الرفع. تأكد من تفعيل خدمة Storage في فايربيس وصلاحيات القواعد (Rules).');
      setUploading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-indigo-500/30 bg-slate-900/50 rounded-2xl p-10 text-center hover:bg-slate-900 transition-all group">
      {uploading ? (
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-slate-300">جاري رفع الملفات...</span>
            <span className="text-sm font-black text-indigo-400">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-slate-300 font-bold mb-2">اسحب وأفلت الملفات هنا، أو</p>
          <p className="text-slate-500 text-sm mb-6">يدعم رفع جميع أنواع الملفات بضغطة واحدة</p>
          
          <label className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl cursor-pointer shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-500/40 transition-all flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            اختيار الملفات
            <input 
              ref={fileInputRef}
              type="file" 
              multiple
              className="hidden" 
              onChange={handleFileChange}
            />
          </label>

          {errorMsg && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-bold w-full max-w-md mx-auto">
              {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
