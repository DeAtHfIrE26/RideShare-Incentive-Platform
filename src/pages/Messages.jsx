import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// This component redirects from the old /messages route to the new /chat route
export default function Messages() {
  const navigate = useNavigate();

  useEffect(() => {
    // Use direct window.location for more reliable redirect between different router implementations
    window.location.href = '/chat';
    // As a fallback, also try the React Router navigate
    navigate('/chat', { replace: true });
  }, [navigate]);

  // Show a loading message briefly while redirecting
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <p className="text-lg text-gray-500">Redirecting to messages...</p>
    </div>
  );
} 