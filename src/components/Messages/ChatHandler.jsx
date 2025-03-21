import { useEffect } from 'react';

// Fix issue with chat initialization after booking
useEffect(() => {
  if (bookingId && contactId) {
    // Initialize chat connection
    initializeChat(bookingId, contactId);
    
    // Fetch previous messages
    fetchChatHistory(bookingId, contactId)
      .then(messages => {
        setMessages(messages);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Failed to fetch chat history:", error);
        setIsLoading(false);
      });
  }
}, [bookingId, contactId]);

// Add reconnection logic in case of connection drops
const initializeChat = (bookingId, contactId) => {
  const socket = new WebSocket(`${WS_BASE_URL}/chat/${bookingId}/${contactId}`);
  
  socket.onopen = () => {
    setConnectionStatus('connected');
    setSocketInstance(socket);
  };
  
  socket.onmessage = (event) => {
    const newMessage = JSON.parse(event.data);
    setMessages(prev => [...prev, newMessage]);
  };
  
  socket.onclose = () => {
    setConnectionStatus('disconnected');
    // Try to reconnect after 3 seconds
    setTimeout(() => initializeChat(bookingId, contactId), 3000);
  };
  
  return socket;
}; 