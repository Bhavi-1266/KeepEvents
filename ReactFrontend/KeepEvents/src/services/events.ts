
import type { PaginatedResponse } from "../types/pagination";
import type { Photo} from "../types/photos"  ;
import type {Event} from "../types/event"
export type PhotoRespond = PaginatedResponse<Photo>;



export async function LoadEventPhotos( eventId: number , offset: number) : Promise<PhotoRespond> {
  const response = await fetch(`/api/photos/?event=${eventId}&limit=20&offset=f${offset}`, {
    method: "GET",
    credentials: "include",
    
  });
  
  if (!response.ok) {
    throw new Error("Invalid userEmail or password");
  }
  return response.json();
  
}

export async function GetNextPhotos(apiUrl: string) : Promise<PhotoRespond> {
  const relativeUrl = new URL(apiUrl).pathname + new URL(apiUrl).search;
  const response = await fetch(`${relativeUrl}`, {
    method: "GET",
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Invalid userEmail or password");
  }
  return response.json();
}



type CreateEventForm = Pick<
  Event,
  | "eventname"
  | "eventdesc"
  | "eventdate"
  | "eventtime"
  | "eventlocation"
  | "visibility"
>;

export async function CreateEventApi(event: CreateEventForm) : Promise<Event> {

  
  const response = await fetch(`/api/events/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(event),
    
  });

  if (!response.ok) {
    throw new Error("Invalid user , cannot create events");
  }
  console.log(response);
  return response.json();
  
} 


export type EventsResponse = PaginatedResponse<Event>;

export async function GetAllEvents({ 
    limit = 20, 
    offset = 0, 
    ordering = "-uploadDate",
    filters = {} // Added default empty object
}: {
    limit?: number;  
    offset?: number; 
    ordering?: string;
    filters?: Record<string, any>; // Type definition for filters
}): Promise<EventsResponse> {
  
  // 1. Initialize params with pagination and ordering
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    ordering: ordering,
  });

  // 2. Dynamically add each filter to the query string
  Object.entries(filters).forEach(([key, value]) => {
    // Only append if the value is not null or undefined
    if (value !== undefined && value !== null) {
        params.append(key, value.toString());
    }
  });

  const response = await fetch(`/api/events/?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
type EventQueryParams = {
  search?: string;
  ordering?: string;
  eventlocation?: string[];
  eventDateFrom?: string; // YYYY-MM-DD
  eventDateTo?: string;   // YYYY-MM-DD
};


export async function getSearchedFilteredSortedEvents(
  params: EventQueryParams
): Promise<EventsResponse> {

  const query = new URLSearchParams();

  if (params.search) {
    query.append("search", params.search);
  }

  if (params.ordering) {
    query.append("ordering", params.ordering);
  }

  if (params.eventlocation?.length) {
    query.append(
      "eventlocation__in",
      params.eventlocation.join(",")
    );
  }

  if (params.eventDateFrom) {
    query.append("eventdate__gte", params.eventDateFrom);
  }

  if (params.eventDateTo) {
    query.append("eventdate__lte", params.eventDateTo);
  }

  const response = await fetch(`/api/events/?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch events");
  }

  return response.json();
}


export async function EventData (eventid : number) : Promise<Event> {
  const response = await fetch(`/api/events/${eventid}`, {
    method: "GET",
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Invalid userEmail or password");
  }
  return response.json();
}

export async function getEventViewers(eventId: number): Promise<any[]> {
  const response = await fetch(`/api/events/${eventId}/viewers/`, {
    credentials: "include",
  });
  if (!response.ok) return [];
  const data = await response.json();
  return data;  // Returns array of users
}

export async function getEventEditors(eventId: number): Promise<any[]> {
  const response = await fetch(`/api/events/${eventId}/editors/`, {
    credentials: "include",
  });
  if (!response.ok) return [];
  const data = await response.json();
  return data;
}


export async function removeEventViewer(eventId: number, userId: number): Promise<void> {
  const response = await fetch(`/api/events/${eventId}/remove_viewer/?userid=${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to remove viewer");
}

export async function removeEventEditor(eventId: number, userId: number): Promise<void> {
  const response = await fetch(`/api/events/${eventId}/remove_editor/?userid=${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to remove editor");
}

export async function patchEventData(eventId: number, data: any): Promise<any> {
  const response = await fetch(`/api/events/${eventId}/`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update event");
  return response.json();
}

export async function patchEventCoverImage(eventId: number, file: File): Promise<any> {
  const formData = new FormData();
  formData.append("eventCoverPhoto", file);
  
  const response = await fetch(`/api/events/${eventId}/`, {
    method: "PATCH",
    credentials: "include",
    body: formData,
  });
  if (!response.ok) throw new Error("Failed to upload cover");
  return response.json();
}



// src/services/eventInvites.ts

export type InviteRole = "viewer" | "editor";

export interface CreateInviteResponse {
  invite_url: string;
  role: InviteRole;
}

export async function createEventInvite(
  eventId: number,
  role: InviteRole,
  expiresAt?: string | null
): Promise<CreateInviteResponse> {
  const response = await fetch(`/api/events/${eventId}/invite/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role,
      expires_at: expiresAt ?? null,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create invite");
  }

  return response.json();
}



export interface AcceptInviteResponse {
  event_id: number;
  role: InviteRole;
}

export async function acceptEventInvite(
  token: string
): Promise<AcceptInviteResponse> {
  const response = await fetch(`/api/invite/${token}/accept/`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Invalid or expired invite");
  }

  return response.json();
}
