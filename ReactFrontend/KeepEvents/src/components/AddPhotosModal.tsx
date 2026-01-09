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
  <div className="fixed inset-0 bg-[#283618]/95 flex flex-col z-[200] animate-in fade-in duration-300">
    <div className="flex items-center justify-between p-6 border-b border-[#606c38]/50">
      <h2 className="text-[#fefae0] text-2xl font-black uppercase tracking-tighter">Import <span className="text-[#dda15e]">Assets</span></h2>
      <div className="flex gap-4">
        <button onClick={onClose} className="px-6 py-2 text-[#fefae0]/60 hover:text-[#fefae0] font-bold uppercase tracking-widest text-xs">Discard</button>
        <button onClick={uploadAll} className="px-8 py-2 bg-[#bc6c25] text-[#fefae0] font-black uppercase tracking-widest text-xs hover:bg-[#dda15e] transition-colors">Push to Cloud ({photos.length})</button>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto p-6 bg-[#fefae0]">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Upload Trigger */}
        <label className="border-4 border-dashed border-[#dda15e]/30 flex flex-col items-center justify-center py-12 px-6 cursor-pointer hover:bg-[#dda15e]/5 transition-colors group">
          <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
          <span className="text-4xl group-hover:scale-110 transition-transform">📂</span>
          <span className="mt-4 font-black uppercase tracking-[0.2em] text-[#283618]">Select Local Files</span>
        </label>

        {photos.map((photo, index) => (
          <div key={index} className="flex gap-0 bg-white border border-[#283618]/10 h-40 shadow-sm">
            <img src={URL.createObjectURL(photo.file)} className="w-40 h-full object-cover border-r border-[#283618]/10" />
            <div className="flex-1 p-4 flex flex-col justify-between">
              <div className="space-y-2">
                <input
                  type="text" placeholder="Add Description..."
                  className="w-full bg-transparent border-b border-[#dda15e]/30 p-1 text-sm outline-none focus:border-[#bc6c25]"
                  value={photo.photoDesc}
                  onChange={(e) => updatePhoto(index, { photoDesc: e.target.value })}
                />
                <input
                  type="text" placeholder="Tags: nature, party, summer..."
                  className="w-full bg-transparent border-b border-[#dda15e]/30 p-1 text-[10px] font-bold text-[#606c38] outline-none"
                  value={photo.extractedTags.join(",")}
                  onChange={(e) => updatePhoto(index, { extractedTags: e.target.value.split(",").map(t => t.trim()) })}
                />
              </div>
              <button onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))} className="text-[10px] font-black uppercase tracking-widest text-red-500 self-end">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
}

export default AddPhotosModal;
