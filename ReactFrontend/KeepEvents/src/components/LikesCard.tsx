import { useState } from "react";
import { togglePhotoLike } from "../services/Photos";
import { toast } from "react-hot-toast";

interface LikesCardProps {
  photo: { 
    photoid: number; 
    photoFile: string; 
    likecount?: number;
  };
  isLikedByCurrentUser?: boolean;
}

function LikesCard({ 
  photo, 
  isLikedByCurrentUser = false 
}: LikesCardProps) {
  const [liked, setLiked] = useState(isLikedByCurrentUser);
  const [likes, setLikes] = useState(photo.likecount || 0);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (loading) return;

    const wasLiked = liked;
    const newLiked = !liked;
    const newLikes = newLiked ? likes + 1 : likes - 1;
    
    // Optimistic update
    setLiked(newLiked);
    setLikes(newLikes);
    setLoading(true);

    try {
      const res = await togglePhotoLike(photo.photoid);
      
      // ✅ Update with server response
      setLiked(res.liked);
      setLikes(res.likes);

      // ✅ Toast feedback
      toast.success(
        wasLiked 
          ? `Unliked (${res.likes} likes)` 
          : `Liked (${res.likes} likes)`
      );
      
    } catch (err) {
      // Rollback on error
      setLiked(liked);
      setLikes(likes);
      toast.error("Toggle failed");
      console.error("Like toggle failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden h-48 w-full">
      {/* Image */}
      <div className="relative h-full">
        {photo.photoFile ? (
          <img
            src={photo.photoFile}
            alt={`Photo ${photo.photoid}`}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            draggable={false}
          />
        ) : (
          <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
            No Image
          </div>
        )}
      </div>

      {/* Perfect Toggle Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleLike();
        }}
        disabled={loading}
        className="absolute top-3 right-3 z-5 flex items-center gap-1.5 bg-white/95 hover:bg-white/100 
                   backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg hover:shadow-xl 
                   border border-gray-200 hover:border-gray-300 transition-all duration-300
                   disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.05]
                   group-hover:bg-white/100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title={liked ? "Unlike" : "Like"}
        aria-label={liked ? "Unlike photo" : "Like photo"}
      >
        <svg
          viewBox="0 0 24 24"
          className={`w-5 h-5 transition-all duration-300 ${
            liked
              ? "fill-red-500 stroke-red-500 drop-shadow-sm scale-110"
              : "fill-transparent stroke-red-500 hover:stroke-red-400 hover:scale-110"
          }`}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21s-6.7-4.35-9.33-7.28C.94 11.74 1.6 7.99 4.9 6.5c2.06-.93 4.29-.14 5.6 1.38C11.81 6.36 14.04 5.57 16.1 6.5c3.3 1.49 3.96 5.24 2.23 7.22C18.7 16.65 12 21 12 21z" />
        </svg>
        <span className="text-xs font-bold text-gray-900 min-w-[1.5rem] text-center">
          {likes}
        </span>
      </button>

      {/* Photo ID badge */}
      <div className="absolute bottom-2 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
        #{photo.photoid}
      </div>
    </div>
  );
}

export default LikesCard;
