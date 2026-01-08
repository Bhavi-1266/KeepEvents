let socket: WebSocket | null = null;
const subscribers = new Map<string, Set<(data: any) => void>>();
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;
const CONNECTION_TIMEOUT = 5000; // 5 seconds to give up on a "Connecting" socket

let reconnectTimeout: number | null = null;
let connectionWatchdog: number | null = null;
let pingInterval: number | null = null;
let userId: number | null = null;

export function connectSocket(userIdParam: number): WebSocket | null {
  // 1. If we are ALREADY OPEN for this user, don't do anything
  if (socket && socket.readyState === WebSocket.OPEN && userId === userIdParam) {
    return socket;
  }

  // 2. If we are currently CONNECTING, wait. But if it's been too long, kill it.
  if (socket && socket.readyState === WebSocket.CONNECTING && userId === userIdParam) {
    console.log("⏳ WebSocket is already trying to connect...");
    return socket;
  }

  // 3. New User or Dead Socket: Clean up everything before starting fresh
  if (userId !== userIdParam || (socket && socket.readyState >= 2)) {
    disconnectSocket();
  }

  userId = userIdParam;

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  console.log(`🔌 [Attempt ${reconnectAttempts + 1}] Connecting for User: ${userId}...`);

  try {
    socket = new WebSocket(`ws://127.0.0.1:8000/ws/?userid=${userId}`);

    // WATCHDOG: If the socket stays in CONNECTING for > 5s, it's a ghost. Kill it.
    if (connectionWatchdog) clearTimeout(connectionWatchdog);
    connectionWatchdog = window.setTimeout(() => {
      if (socket && socket.readyState === WebSocket.CONNECTING) {
        console.warn("⚠️ Connection timed out. Retrying...");
        disconnectSocket();
        attemptReconnect();
      }
    }, CONNECTION_TIMEOUT);

    socket.onopen = () => {
      console.log("✅ WebSocket Connected Successfully");
      if (connectionWatchdog) clearTimeout(connectionWatchdog);
      reconnectAttempts = 0;
      startHeartbeat();
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "pong") return;
        
        // Match against msg.event (your Django util) or msg.type
        const eventType = msg.event || msg.type;
        const handlers = subscribers.get(eventType);
        
        if (handlers) {
          handlers.forEach((cb) => cb(msg.data));
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    socket.onclose = (event) => {
      stopHeartbeat();
      if (connectionWatchdog) clearTimeout(connectionWatchdog);
      
      // event.code 1000 is "Normal Closure" (we called disconnectSocket)
      if (event.code !== 1000 && userId) {
        console.log(`🔌 Socket closed unexpectedly (${event.code}).`);
        socket = null;
        attemptReconnect();
      } else {
        console.log("🔌 Socket closed by client.");
        socket = null;
      }
    };

    socket.onerror = (err) => {
      console.error("❌ WebSocket Network Error");
      // Don't call attemptReconnect here, onclose will handle it
    };

  } catch (err) {
    console.error("❌ Critical error creating WebSocket:", err);
    attemptReconnect();
  }

  return socket;
}

function attemptReconnect() {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && userId) {
    reconnectAttempts++;
    const delay = RECONNECT_DELAY * reconnectAttempts;
    
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = window.setTimeout(() => {
      if (userId) connectSocket(userId);
    }, delay);
  }
}

// ... (startHeartbeat, stopHeartbeat, subscribe, disconnectSocket are same as previous)
// Ensure disconnectSocket clears connectionWatchdog too!

function startHeartbeat() {
  stopHeartbeat();
  pingInterval = window.setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "ping" }));
    }
  }, 30000);
}

function stopHeartbeat() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

export function subscribe(type: string, callback: (data: any) => void) {
  if (!subscribers.has(type)) {
    subscribers.set(type, new Set());
  }
  subscribers.get(type)!.add(callback);

  // Return unsubscribe function
  return () => {
    const handlers = subscribers.get(type);
    if (handlers) {
      handlers.delete(callback);
      if (handlers.size === 0) subscribers.delete(type);
    }
  };
}

export function disconnectSocket() {
  console.log("Cleaning up WebSocket connection...");
  stopHeartbeat();
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  if (socket) {
    // 1000 = Normal Closure
    socket.close(1000, "Client disconnecting");
    socket = null;
  }
  
  userId = null;
  reconnectAttempts = 0;
}