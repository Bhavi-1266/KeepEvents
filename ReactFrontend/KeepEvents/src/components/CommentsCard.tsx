import { useState } from "react";
import { deleteComment } from "../services/Photos.ts"; // Your delete service
import { toast } from "react-hot-toast";

interface CommentsCardProps {
  comment: {
    id: number;
    commentText: string;
    commentedAt: string;
    photo: {
      photoid: number;
      photoFile: string;
      title?: string;
    };
  };
  onDelete: (commentId: number) => void;
}

function CommentsCard({ comment, onDelete }: CommentsCardProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    
    setDeleting(true);
    try {
      await deleteComment(comment.id);
      onDelete(comment.id);
      toast.success("Comment deleted");
    } catch (err) {
      toast.error("Failed to delete comment");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="group relative bg-white p-5 rounded-[2rem] border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_40px_-10px_rgba(153,192,255,0.2)] hover:border-[#99c0ff]/30 transition-all duration-300 cursor-default hover:-translate-y-1">
      
      {/* Hover Decoration Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-50/50 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative flex items-start gap-4 z-10">
        
        {/* Photo Thumbnail */}
        <div className="flex-shrink-0 relative">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm ring-4 ring-slate-50 group-hover:ring-[#eef6ff] transition-all duration-300">
            <img
              src={comment.photo.photoFile}
              alt={comment.photo.title || `Photo ${comment.photo.photoid}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              draggable={false}
            />
          </div>
          {/* Decorative dot */}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center">
             <div className="w-2.5 h-2.5 bg-[#99c0ff] rounded-full"></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-black text-slate-800 text-sm tracking-tight truncate pr-2">
              {comment.photo.title || `Untitled Photo`}
            </h4>
            
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="group/btn flex-shrink-0 p-2 rounded-full hover:bg-[#fff0f0] transition-colors text-slate-300 hover:text-[#ff3333] disabled:opacity-50"
              title="Delete comment"
            >
              <svg className="w-4 h-4 transition-transform group-hover/btn:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Date Label */}
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
             {new Date(comment.commentedAt).toLocaleDateString()}
          </p>
          
          {/* Comment Bubble */}
          <div className="relative bg-slate-50 rounded-2xl rounded-tl-none px-4 py-3 border border-slate-100 group-hover:bg-white group-hover:border-blue-100 transition-colors">
             <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
              "{comment.commentText}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommentsCard;
