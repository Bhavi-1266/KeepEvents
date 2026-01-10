// src/contexts/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, subscribe } from '../services/socket';
import { getMe } from '../services/auth';

interface WebSocketContextType {
  subscribe: typeof subscribe;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isConnectedRef = useRef(false);
  const userIdRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeWebSocket = async () => {
      try {
        const data = await getMe();
        const userId = data.user.userid;

        if (!isMounted) return;

        // Only connect if we haven't connected yet or userId changed
        if (!isConnectedRef.current || userIdRef.current !== userId) {
          console.log('🔌 [WebSocketProvider] Connecting for user:', userId);
          userIdRef.current = userId;
          connectSocket(userId);
          isConnectedRef.current = true;
        }
      } catch (error) {
        console.log('❌ [WebSocketProvider] No user logged in');
        // Don't connect if not authenticated
      }
    };

    initializeWebSocket();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (isConnectedRef.current) {
        console.log('🔌 [WebSocketProvider] Disconnecting...');
        disconnectSocket();
        isConnectedRef.current = false;
        userIdRef.current = null;
      }
    };
  }, []); // Empty dependency array - connect only once

  const value: WebSocketContextType = {
    subscribe,
    isConnected: isConnectedRef.current,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};