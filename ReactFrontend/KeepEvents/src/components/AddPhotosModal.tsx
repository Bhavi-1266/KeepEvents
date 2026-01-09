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
  <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[200] animate-in fade-in duration-300 p-4">
    <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-gray-200">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-gray-900 text-xl font-bold">
          Import <span className="text-blue-600">Photos</span>
        </h2>
        <div className="flex gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={uploadAll} 
            className="px-6 py-2 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-md"
          >
            Upload ({photos.length})
          </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          
          {/* Upload Trigger */}
          <label className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center py-8 px-6 cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-all group">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleFileSelect} 
              className="hidden" 
            />
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
              <span className="text-2xl">📂</span>
            </div>
            <span className="font-semibold text-gray-700 mb-1">Select Photos</span>
            <span className="text-xs text-gray-500">Click to browse your files</span>
          </label>

          {/* Photos List */}
          {photos.map((photo, index) => (
            <div 
              key={index} 
              className="flex gap-4 bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <div className="flex-shrink-0">
                <img 
                  src={URL.createObjectURL(photo.file)} 
                  className="w-24 h-24 object-cover rounded-xl border border-gray-200" 
                  alt="Preview"
                />
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div className="space-y-2">
                  {/* Description Input */}
                  <input
                    type="text" 
                    placeholder="Add a description..."
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    value={photo.photoDesc}
                    onChange={(e) => updatePhoto(index, { photoDesc: e.target.value })}
                  />
                  
                  {/* Tags Input */}
                  <input
                    type="text" 
                    placeholder="Tags: nature, party, summer..."
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    value={photo.extractedTags.join(", ")}
                    onChange={(e) => updatePhoto(index, { 
                      extractedTags: e.target.value.split(",").map(t => t.trim()).filter(t => t) 
                    })}
                  />
                </div>

                {/* Remove Button */}
                <button 
                  onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))} 
                  className="text-xs font-semibold text-red-500 hover:text-red-700 self-end mt-2 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {photos.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4 opacity-20">📷</div>
              <p className="text-gray-400 text-sm">No photos selected yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer (Optional - for status/info) */}
      {photos.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50/50">
          <p className="text-xs text-gray-500">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} ready to upload
          </p>
        </div>
      )}
    </div>
  </div>
);
}

export default AddPhotosModal;
