let socket: WebSocket | null = null;
const subscribers = new Map<string, Set<(data: any) => void>>();


export function connectSocket( userId: number): WebSocket {
  if (socket && socket.readyState === WebSocket.OPEN) return socket;

  console.log("Connecting to WebSocket...");

  socket = new WebSocket(`ws://127.0.0.1:8000/ws/?userid=${userId}`);

  socket.onopen = () => {
    console.log("Connected to WebSocket");
  };

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const handlers = subscribers.get(msg.type);
    handlers?.forEach((cb) => cb(msg.data));
  };

  socket.onerror = (err) => {
    console.error("WebSocket error", err);
  };

  socket.onclose = () => {
    console.log("WebSocket closed");
    socket = null;
  };

  return socket;
}



export function subscribe(type: string, callback: (data: any) => void) {
  if (!subscribers.has(type)) {
    subscribers.set(type, new Set());
  }
  subscribers.get(type)!.add(callback);

  return () => {
    subscribers.get(type)?.delete(callback);
  };
}

export function disconnectSocket() {
  socket?.close();
  socket = null;
}
