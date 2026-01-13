import { useState } from "react";
import type { Photo } from "../types/photos";
import { togglePhotoLike } from "../services/Photos";

interface PhotoCardProps {
  photo: Photo;
  selected : boolean
  selectionMode : boolean
  onToggleSelect?: (photoId: number) => void;
  onClick?: () => void;
}

function PhotoCard({ photo, selected,selectionMode, onToggleSelect, onClick }: PhotoCardProps) {
  const [liked, setLiked] = useState(photo.isLikedByCurrentUser);
  const [likes, setLikes] = useState(photo.likes);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (loading) return;

    // optimistic UI update
    setLiked(!liked);
    setLikes((prev) => (liked ? prev - 1 : prev + 1));
    setLoading(true);

    try {
      const res = await togglePhotoLike(photo.photoid);
      setLiked(res.liked);
      setLikes(res.likes);
    } catch (err) {
      // rollback on failure
      setLiked(liked);
      setLikes(likes);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div
    className={`group flex flex-col rounded-2xl h-full transition-all duration-300 relative overflow-hidden
      backdrop-blur-md border shadow-sm
      ${
        selected
          ? "bg-white/80 border-[#bc6c25] ring-2 ring-[#bc6c25]/50 shadow-[0_0_20px_rgba(188,108,37,0.3)] transform -translate-y-1" // Selected: Orange Border + Glow
          : "bg-white/30 border-white/40 hover:bg-white/50 hover:border-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1" // Default: Glass
      }`}
    onClick={() => {
      if (selectionMode) {
        onToggleSelect?.(photo.photoid);
      } else {
        onClick?.();
      }
    }}
  >
    {/* Selection checkbox - Visible on Hover OR if Selected */}
    <div
      className={`absolute top-3 left-3 z-20 transition-all duration-200
        ${selected ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggleSelect?.(photo.photoid);
      }}
    >
      <div
        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all duration-200 shadow-sm
          ${
            selected
              ? "bg-[#bc6c25] border-[#bc6c25]" // Selected: Solid Orange
              : "bg-white/60 border-[#283618]/20 backdrop-blur-md hover:border-[#bc6c25]" // Unselected: Glass
          }`}
      >
        {selected && <span className="text-white text-[10px] font-bold">✓</span>}
      </div>
    </div>

    {/* Image Area - Subtle Green Tint instead of Gray */}
    <div className="relative flex-1 bg-[#283618]/5 flex items-center justify-center overflow-hidden border-b border-white/20">
      {photo.photoFile ? (
        <img
          src={photo.photoFile}
          alt={photo.photoDesc || "Photo"}
          className="h-52 w-full object-contain select-none pointer-events-auto transition-transform duration-700 group-hover:scale-110"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      ) : (
        <div className="h-52 w-full flex flex-col items-center justify-center text-[#283618]/20 gap-2">
          <span className="text-4xl">📷</span>
          <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
        </div>
      )}
      
      {/* Glossy Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#283618]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>

    {/* Footer - Glassy White */}
    <div
      className="flex items-center justify-between px-4 py-3 bg-white/60 backdrop-blur-md border-t border-white/40 text-[#283618] relative z-10"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={handleLike}
        disabled={loading}
        className="flex items-center gap-2 group/btn transition-transform active:scale-95"
        aria-label="Like photo"
      >
        {/* Heart SVG */}
        <svg
          viewBox="0 0 24 24"
          className={`w-5 h-5 transition-all duration-300 drop-shadow-sm ${
            liked
              ? "fill-red-500 stroke-red-500 scale-110" // Liked
              : "fill-transparent stroke-[#283618]/40 group-hover/btn:stroke-red-500 group-hover/btn:scale-110" // Unliked
          }`}
          strokeWidth={2}
        >
          <path d="M12 21s-6.7-4.35-9.33-7.28C.94 11.74 1.6 7.99 4.9 6.5c2.06-.93 4.29-.14 5.6 1.38C11.81 6.36 14.04 5.57 16.1 6.5c3.3 1.49 3.96 5.24 2.23 7.22C18.7 16.65 12 21 12 21z" />
        </svg>

        <span className="text-[10px] font-black text-[#283618] uppercase tracking-widest translate-y-[1px]">
          {likes}
        </span>
      </button>

      {/* View Count */}
      <div className="flex items-center gap-1.5 opacity-60">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className="text-[10px] font-black text-[#283618] uppercase tracking-widest">
            {photo.viewcount}
        </span>
      </div>
    </div>
  </div>
);
}

export default PhotoCard;


