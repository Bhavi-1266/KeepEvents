import type { User } from "./user.ts";
import type { Event } from "./event.ts";

export interface PhotoFaceUser {
  userid: number;
  username: string;
}

export interface Photo {
  photoid: number;
  photoFile: string | null;
  photoDesc: string | null;
  uploadDate: string;

  extractedTags: string[] | null;
  photoMeta: Record<string, any> | null;

  // counts
  likes: number;
  viewcount: number | null;
  downloadcount: number | null;
  commentcount: number | null;

  // face recognition
  Faces: PhotoFaceUser[];      // [{ userid, username }]
  FaceCount: number;
  HasUserFace: boolean;

  // relations
  event: Event | null;
  uploadedBy: User | null;

  // per-user flags
  isLikedByCurrentUser: boolean;
}


export interface PhotoDraft {
  file: File;
  photoDesc: string;
  extractedTags: string[];
}

// Nested User Interface (Matches UserForLikesCommentsSerializer)
export interface SimpleUser {
  userid: number;
  username: string;
}

// Nested Photo Interface (Matches PhotoForLikesCommentsSerializer)
export interface SimplePhoto {
  photoid: number;
  photoFile: string; // URL string from DRF
  likecount: number;
}

export interface Like {
  id: number; // DRF usually defaults to 'id' unless 'likeid' is explicitly set in model
  user: SimpleUser;
  Photo: SimplePhoto; // Matches the capitalized 'Photo' in your Serializer
  likedAt: string;
}

export interface Comment {
  id: number;
  user: SimpleUser;
  Photo: SimplePhoto; // Matches the capitalized 'Photo' in your Serializer
  commentText: string;
  commentAt: string;
}