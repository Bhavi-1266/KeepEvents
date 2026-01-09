
import type { Photo , Like , Comment} from "../types/photos";
import type { PaginatedResponse } from "../types/pagination";


interface PhotoRespond extends PaginatedResponse<Photo> {}
interface LikesRespond extends PaginatedResponse<Like> {}
interface CommentsRespond extends PaginatedResponse<Comment> {}

interface PhotoDraft {
    file: File;
    photoDesc: string;
    extractedTags: string[];
}

export default async function addMany(photos: PhotoDraft[], eventId: number) {
//form  data send
  const formData = new FormData();

  photos.forEach((photo) => {
    formData.append("photoFile", photo.file);

    formData.append("photoDesc", photo.photoDesc ?? "");

    formData.append("event_id", String(eventId));

    // tags are JSON-stringified
    formData.append(
      "extractedTags",
      JSON.stringify(photo.extractedTags ?? [])
    );
  }); 

  
  const response = await fetch("/api/photos/bulk-create/", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error || "Bulk upload failed");
  }

  return response.json();
}




export async function getAllPhotos({ 
    limit = 20, 
    offset = 0, 
    ordering = "-uploadDate",
    filters = {},
}: {
    limit?: number;  
    offset?: number; 
    ordering?: string;
    filters?: Record<string, any>; // Improved type safety
}): Promise<PhotoRespond> {    

    // 1. Construct the base URL and initial params
    const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ordering: ordering
    });

    // 2. Append filters to the URLSearchParams object
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
        }
    });

    // 3. Use the constructed query string in the fetch call
    const response = await fetch(`/api/photos/?${queryParams.toString()}`, {
        method: "GET",
        credentials: "include",
    });

    if (!response.ok) {
        // Improved error handling to see status code
        throw new Error(`Failed to fetch photos: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

export async function getNextSetPhotos(apiUrl: string): Promise<PhotoRespond> {
  const relativeUrl = new URL(apiUrl).pathname + new URL(apiUrl).search;
  const response = await fetch(`${relativeUrl}`, {
    method: "GET",
    credentials: "include",
  })  

  if (!response.ok) {
    throw new Error("Invalid userEmail or password");
  }
  return response.json();
}

// services/Photos.ts

export type PhotoQueryParams = {
  search?: string;
  ordering?: string;
  date_after?: string;
  date_before?: string;
  event?: number;
};


export async function getSearchedFilteredSortedPhotos(
  params: PhotoQueryParams
) {
  const query = new URLSearchParams();

  if (params.search) {
    query.append("search", params.search);
  }

  if (params.ordering) {
    query.append("ordering", params.ordering);
  }

  if (params.date_after) {
    query.append("date_after", params.date_after);
  }

  if (params.date_before) {
    query.append("date_before", params.date_before);
  }

  if (params.event) {
    query.append("event", String(params.event));
  }
  

  const res = await fetch(`/api/photos/?limit=20&${query.toString()}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch filtered photos");
  }

  return res.json();
}


export async function togglePhotoLike(photoId: number) {
  const response = await fetch(
    `/api/photos/${photoId}/toggle-like/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // important for auth
    }
  );

  if (!response.ok) {
    throw new Error("Failed to toggle like");
  }

  return response.json() as Promise<{
    liked: boolean;
    likes: number;
  }>;
}


export async function GetMyClicks(userId: number) {
  const response = await fetch(`/api/photos/?user=${userId}&limit=20`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Invalid Couldt get you clicks");
  }
  return response.json();

}
export interface BulkDeleteResponse {
  deleted: number[];
  skipped_no_permission: number[];
}

export async function DeletePhotos(
  photoIds: number[]
): Promise<BulkDeleteResponse> {
  const response = await fetch("/api/photos/bulk-delete/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      photo_ids: photoIds,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to delete photos");
  }

  return response.json();
}


export async function getComments({
  photoId,        // Optional now
  nextUrl,
  limit = 20,
  offset = 0,
  ordering = "-commentedAt",  // Fixed field name to match your DB
  filters = {}
}: {
  photoId?: number;     // ✅ OPTIONAL
  nextUrl?: string;
  limit?: number;
  offset?: number;
  ordering?: string;
  filters?: Record<string, any>;
}): Promise<CommentsRespond> {
  
  let url = nextUrl;

  if (!url) {
    const params = new URLSearchParams({
      limit: limit!.toString(),
      ordering: ordering!,
    });

    // ✅ Only add photoId if VALID (not 0, not undefined)
    if (photoId && photoId > 0) {
      params.append("photo", photoId.toString());
    }

    // ✅ Add filters (userid for my comments)
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== 0) {
        params.append(key, value.toString());
      }
    });

    // ✅ Add offset if needed
    if (offset && offset > 0) {
      params.append("offset", offset.toString());
    }

    url = `/api/comments/?${params.toString()}`;
  }

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch comments: ${response.status} - ${errorText}`);
  }
  return response.json();
}


export async function getLikes({
  photoId,        // Optional now
  nextUrl,
  offset = 0,
  limit = 20,
  ordering = "-likedAt",
  filters = {}
}: {
  photoId?: number;     // ✅ OPTIONAL
  nextUrl?: string;
  limit?: number;
  offset?: number;
  ordering?: string;
  filters?: Record<string, any>;
}): Promise<LikesRespond> {
  
  let url = nextUrl;

  if (!url) {
    const params = new URLSearchParams({
      limit: limit!.toString(),
      ordering: ordering!,
    });

    // ✅ Only add photoId if VALID
    if (photoId && photoId > 0) {
      params.append("photo", photoId.toString());
    }

    // ✅ Add user filters for MY likes
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== 0) {
        params.append(key, value.toString());
      }
    });

    if (offset > 0) {
      params.append("offset", offset.toString());
    }

    url = `/api/likes/?${params.toString()}`;
  }

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch likes: ${response.status}`);
  }
  return response.json();

}


// services/Photos.ts
export async function addComment(commentText: string, photoId: number) : Promise<Comment> {
  const data = {
    photo_id: photoId,
    commentText: commentText,
  };
  console.log(data);
  const response = await fetch(`/api/comments/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to add comment");
  }
  return response.json();
}



// services/Photos.ts
export async function deleteComment(commentid: number) {
  const res = await fetch(`/api/comments/${commentid}/`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to delete comment");
  }
}

export async function getViews(photoId: number) {
  const response = await fetch(`/api/views/?photo=${photoId}`, {
    method: "GET",
    credentials: "include",
  });
}
  
export async function addView(photoId: number) {
  const response = await fetch(
    `/api/views/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // important for auth
      body: JSON.stringify({ photo: photoId }),
    }
  );
  if (!response.ok) {
    throw new Error("Failed to add view");
  }

  return response.json();
}