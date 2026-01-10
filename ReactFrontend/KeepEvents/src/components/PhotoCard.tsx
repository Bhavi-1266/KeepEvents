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
    className={`group flex flex-col rounded-xl h-full border transition-all duration-300 relative overflow-hidden bg-[#fefae0]/30
      ${
        selected
          ? "border-black ring-1 ring-black shadow-2xl" // Selected
          : "border-black/10 hover:border-black/30 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1"
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
      className={`absolute top-3 left-3 z-20 transition-opacity duration-200
        ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggleSelect?.(photo.photoid);
      }}
    >
      <div
        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-200
          ${
            selected
              ? "bg-black border-black scale-100"
              : "bg-white/80 border-black/10 hover:border-black/50 backdrop-blur-md"
          }`}
      >
        {selected && <span className="text-white text-[10px] font-bold">✓</span>}
      </div>
    </div>

    {/* Image Area */}
    <div className="relative flex-1 bg-neutral-100 flex items-center justify-center overflow-hidden border-b border-black/5">
      {photo.photoFile ? (
        <img
          src={photo.photoFile}
          alt={photo.photoDesc || "Photo"}
          className="h-52 w-full object-contain select-none pointer-events-auto transition-transform duration-500 group-hover:scale-105"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      ) : (
        <div className="h-52 w-full flex flex-col items-center justify-center text-black/20 gap-2">
          <span className="text-xs font-black uppercase tracking-widest">No Image</span>
        </div>
      )}
    </div>

    {/* Footer */}
    <div
      className="flex items-center justify-between px-4 py-3 bg-[#79afa4]/30 text-[#fefae0] relative z-10"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={handleLike}
        disabled={loading}
        className="flex items-center gap-2 group/btn"
        aria-label="Like photo"
      >
        {/* Heart SVG - Red when liked */}
        <svg
          viewBox="0 0 24 24"
          className={`w-5 h-5 transition-all duration-300 ${
            liked
              ? "fill-red-500 stroke-red-500 scale-110" // Liked: Red fill
              : "fill-transparent stroke-black/40 group-hover/btn:stroke-red-500" // Unliked: Gray outline, turns Red on hover
          }`}bg-white
          strokeWidth={2}
        >
          <path d="M12 21s-6.7-4.35-9.33-7.28C.94 11.74 1.6 7.99 4.9 6.5c2.06-.93 4.29-.14 5.6 1.38C11.81 6.36 14.04 5.57 16.1 6.5c3.3 1.49 3.96 5.24 2.23 7.22C18.7 16.65 12 21 12 21z" />
        </svg>

        <span className="text-[10px] font-black text-black uppercase tracking-widest translate-y-[1px]">
          {likes}
        </span>
        
      </button>
      <div  className="text-[10px] font-black text-black uppercase tracking-widest align-self-end"> {photo.viewcount}</div >
    </div>
  </div>
);
}

export default PhotoCard;


