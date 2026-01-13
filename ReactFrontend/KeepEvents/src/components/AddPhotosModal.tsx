import { useState } from "react";
import type { PhotoDraft } from "../types/photos";
import addMany from "../services/Photos";
import { tagImageWithBlip } from "../services/Tagging";

interface Props {   
  eventId: number;
  onClose: () => void;
  sucessCallback?: () => void;
  failureCallback?: () => void;
}

interface PhotoDraftUI extends PhotoDraft {
  file: File;
  isTagging: boolean;
}

function AddPhotosModal({ eventId, onClose , sucessCallback, failureCallback }: Props) {
  const [photos, setPhotos] = useState<PhotoDraftUI[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);

    const drafts: PhotoDraftUI[] = files.map(file => ({
      file,
      photoDesc: "",
      extractedTags: [],
      isTagging: true,
    }));

    setPhotos(prev => [...prev, ...drafts]);

    files.forEach(async (file, idx) => {
      try {
        const tags = await tagImageWithBlip(file);

        setPhotos(prev =>
          prev.map((p, i) =>
            i === prev.length - files.length + idx
              ? { ...p, extractedTags: tags, isTagging: false }
              : p
          )
        );
      } catch {
        setPhotos(prev =>
          prev.map((p, i) =>
            i === prev.length - files.length + idx
              ? { ...p, isTagging: false }
              : p
          )
        );
      }
    });
  };

  const updatePhoto = (index: number, updates: Partial<PhotoDraftUI>) => {
    setPhotos(prev =>
      prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
    );
  };

  const uploadAll = async () => {
    try {
      setIsUploading(true);

      // Strip UI-only field before sending
      const payload = photos.map(({ isTagging, ...rest }) => rest);

      await addMany(payload, eventId);
      onClose();
      sucessCallback?.();
    } finally {
      setIsUploading(false);
    }
  };

  return (
  <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-[200] animate-in fade-in duration-300 p-4 font-sans">
    
    <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-2xl max-h-[85vh] flex flex-col border border-white relative overflow-hidden">
      
      {/* Top Gradient Decoration */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#ff9999] via-[#ffcc99] to-[#99c0ff]"></div>

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100/50 bg-white/50">
        <div>
          <span className="text-[#99c0ff] font-black text-[10px] uppercase tracking-[0.3em] block mb-1">
            Upload
          </span>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Add <span className="text-[#99c0ff]">Memories</span>
          </h2>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={onClose} 
            className="px-5 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-bold uppercase text-xs tracking-widest rounded-xl transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={uploadAll} 
            disabled={photos.length === 0}
            className="px-6 py-3 bg-[#99c0ff] text-[#1e3a8a] font-black uppercase text-xs tracking-widest rounded-xl hover:bg-[#77aaff] transition-all shadow-lg shadow-blue-100 hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
          >
            Upload ({photos.length})
          </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
        {/* Upload Trigger Area */}
        <label className="group relative border-2 border-dashed border-[#ffcc99] bg-[#fffbf5] rounded-[2rem] flex flex-col items-center justify-center py-10 px-6 cursor-pointer hover:bg-[#fff5eb] hover:border-[#ffb366] transition-all duration-300">
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleFileSelect} 
            className="hidden" 
          />
          <div className="w-16 h-16 rounded-full bg-[#ffcc99] text-white flex items-center justify-center mb-4 shadow-lg shadow-orange-100 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          </div>
          <span className="font-black text-slate-700 text-lg mb-1">Select Photos</span>
          <span className="text-xs font-bold uppercase tracking-widest text-[#ffcc99]">Click to browse files</span>
        </label>

        {/* Photos List */}
        <div className="space-y-4">
          {photos.map((photo, index) => (
            <div 
              key={index} 
              className="flex gap-5 bg-white border border-slate-100 rounded-[1.5rem] p-4 shadow-sm hover:shadow-md transition-shadow group animate-in slide-in-from-bottom-2 duration-300"
            >
              {/* Thumbnail */}
              <div className="flex-shrink-0 relative">
                <img 
                  src={URL.createObjectURL(photo.file)} 
                  className="w-28 h-28 object-cover rounded-2xl shadow-sm" 
                  alt="Preview"
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-black/5"></div>
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                <div className="space-y-3">
                  {/* Description Input */}
                  <div className="relative group/input">
                    <input
                      type="text" 
                      placeholder="Add a caption..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#99c0ff] focus:bg-white transition-all"
                      value={photo.photoDesc}
                      onChange={(e) => updatePhoto(index, { photoDesc: e.target.value })}
                    />
                  </div>
                  
                  {/* Tags Input */}
                  <div className="relative group/input">
                    <input
                      type="text" 
                      placeholder="Tags: nature, party..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 placeholder:text-slate-400 outline-none focus:border-[#aaff99] focus:bg-white transition-all"
                      value={photo.extractedTags.join(", ")}
                      onChange={(e) => updatePhoto(index, { 
                        extractedTags: e.target.value.split(",").map(t => t.trim()).filter(t => t) 
                      })}
                    />
                  </div>
                </div>

                {/* Remove Button */}
                <button 
                  onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))} 
                  className="text-[10px] font-black uppercase tracking-widest text-[#ff3333] hover:text-[#cc0000] hover:underline self-end mt-2 transition-colors flex items-center gap-1"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {photos.length === 0 && (
          <div className="text-center py-8 opacity-50">
            <p className="text-xs font-black uppercase tracking-widest text-slate-300">No photos selected yet</p>
          </div>
        )}
      </div>

      {/* Footer Status */}
      {photos.length > 0 && (
        <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
             Ready to upload
           </span>
           <span className="text-sm font-bold text-[#99c0ff]">
            {photos.length} item{photos.length !== 1 ? 's' : ''}
           </span>
        </div>
      )}
    </div>
  </div>
);
}

export default AddPhotosModal;
