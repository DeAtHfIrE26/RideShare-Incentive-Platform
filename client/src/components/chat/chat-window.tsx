import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { format } from "date-fns";
import { AlertCircle, CheckCircle2, Clock, MoreHorizontal, PhoneCall, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Extended Booking type to match the one defined in chat-page.tsx
type ExtendedBooking = {
  id: number;
  userId: number | null;
  rideId: number | null;
  status: string | null;
  seats: number;
  createdAt: Date | null;
  specialRequests: string | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  paymentStatus: string | null;
  ride?: {
    id: number;
    driverId: number;
    origin: string;
    destination: string;
    date: Date;
    availableSeats: number;
    price: number;
  };
};

type ChatWindowProps = {
  selectedUser: User | null;
  selectedBooking: ExtendedBooking | null;
};

// Extended Message type to ensure it matches what we need
type ChatMessage = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: Date;
  isRead: boolean;
  rideId?: number | null;
  bookingId?: number; // For backward compatibility with existing code
};

// Mock messages for the chat
const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 101,
    senderId: 1,
    receiverId: 2,
    content: "Hey, are you still available for the ride tomorrow?",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isRead: true,
    rideId: null
  },
  {
    id: 102,
    senderId: 2,
    receiverId: 1,
    content: "Yes, I'll be there on time. Looking forward to it!",
    createdAt: new Date(Date.now() - 118 * 60 * 1000),
    isRead: true,
    rideId: null
  },
  {
    id: 103,
    senderId: 1,
    receiverId: 2,
    content: "Great! I'll pick you up at the usual spot.",
    createdAt: new Date(Date.now() - 115 * 60 * 1000),
    isRead: true,
    rideId: null
  },
  {
    id: 104,
    senderId: 2,
    receiverId: 1,
    content: "Perfect. Should I bring anything?",
    createdAt: new Date(Date.now() - 100 * 60 * 1000),
    isRead: true,
    rideId: null
  },
  {
    id: 105,
    senderId: 1,
    receiverId: 2,
    content: "Just yourself and maybe some music recommendations for the trip!",
    createdAt: new Date(Date.now() - 90 * 60 * 1000),
    isRead: true,
    rideId: null
  },
  {
    id: 106,
    senderId: 2,
    receiverId: 1,
    content: "I've got a great playlist ready 🎵",
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    isRead: false,
    rideId: null
  }
];

// Mock messages for the booking chat
const MOCK_BOOKING_MESSAGES: ChatMessage[] = [
  {
    id: 201,
    senderId: 3,
    receiverId: 2,
    rideId: 1,
    bookingId: 1,
    content: "Hi! I'll be driving tomorrow for your airport trip.",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    isRead: true
  },
  {
    id: 202,
    senderId: 2,
    receiverId: 3,
    rideId: 1,
    bookingId: 1,
    content: "Thanks for letting me know! What time should I be ready?",
    createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
    isRead: true
  },
  {
    id: 203,
    senderId: 3,
    receiverId: 2,
    rideId: 1,
    bookingId: 1,
    content: "Please be ready by 9:45 AM, we'll need to leave by 10 AM sharp to make sure you reach on time.",
    createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
    isRead: true
  },
  {
    id: 204,
    senderId: 2,
    receiverId: 3,
    rideId: 1,
    bookingId: 1,
    content: "Perfect, I'll be ready!",
    createdAt: new Date(Date.now() - 21 * 60 * 60 * 1000),
    isRead: true
  },
  {
    id: 205,
    senderId: 3,
    receiverId: 2,
    rideId: 1,
    bookingId: 1,
    content: "Do you have any luggage? Just want to make sure I have enough space in the trunk.",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    isRead: true
  }
];

export default function ChatWindow({ selectedUser, selectedBooking }: ChatWindowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(true); // Default to connected for mock
  const [hasLoadedInitialMessages, setHasLoadedInitialMessages] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messagesLoading, setMessagesLoading] = useState(true);
  
  // Use mock data instead of API requests
  useEffect(() => {
    // Reset state when user or booking changes
    setMessages([]);
    setNewMessage("");
    setIsTyping(false);
    setLoadError(null);
    setMessagesLoading(true);
    setHasLoadedInitialMessages(false);
    
    try {
      // Choose messages based on the selected context
      const mockMessages = selectedBooking 
        ? MOCK_BOOKING_MESSAGES
        : selectedUser?.id === 2 
          ? MOCK_CHAT_MESSAGES 
          : [];
      
      // Simulate a delay for loading
      setTimeout(() => {
        setMessages(mockMessages);
        setMessagesLoading(false);
        setHasLoadedInitialMessages(true);
        scrollToBottom();
      }, 800);
      
      // Simulate typing indicator after 2 seconds for better UX
      if (selectedUser?.id === 2) {
        setTimeout(() => {
          setIsTyping(true);
          // Clear typing indicator after 3 seconds
          setTimeout(() => setIsTyping(false), 3000);
        }, 2000);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      setLoadError("Failed to load messages. Please try again.");
      setMessagesLoading(false);
    }
  }, [selectedUser, selectedBooking]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      // Create a mock message
      const newMockMessage: ChatMessage = {
        id: Math.floor(Math.random() * 10000),
        senderId: user.id,
        receiverId: selectedUser?.id || 0,
        bookingId: selectedBooking?.id,
        content: newMessage.trim(),
        createdAt: new Date(),
        isRead: false
      };
      
      // Add to messages
      setMessages(prev => [...prev, newMockMessage]);
      setNewMessage("");
      scrollToBottom();
      
      // Simulate a response after 1-3 seconds
      if (Math.random() > 0.3) {
        setTimeout(() => {
          setIsTyping(true);
          
          setTimeout(() => {
            setIsTyping(false);
            
            const responseMessages = [
              "Got it, thanks for letting me know!",
              "Perfect! I appreciate the update.",
              "That sounds great!",
              "I'll keep that in mind.",
              "Thanks for the info 👍",
              "See you then!"
            ];
            
            const responseMessage: ChatMessage = {
              id: Math.floor(Math.random() * 10000),
              senderId: selectedUser?.id || 0,
              receiverId: user.id,
              bookingId: selectedBooking?.id,
              content: responseMessages[Math.floor(Math.random() * responseMessages.length)],
              createdAt: new Date(),
              isRead: true
            };
            
            setMessages(prev => [...prev, responseMessage]);
            scrollToBottom();
          }, 1500 + Math.random() * 1500);
        }, 1000 + Math.random() * 2000);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };
  
  // Simulate typing indicator when user is typing
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };
  
  // Format message timestamp
  const formatMessageTime = (timestamp: string | Date | null | undefined) => {
    if (!timestamp) return "";
    
    try {
      const messageDate = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // If message is from today, just show time
      if (messageDate.toDateString() === today.toDateString()) {
        return format(messageDate, "h:mm a");
      }
      
      // If message is from yesterday, show "Yesterday" and time
      if (messageDate.toDateString() === yesterday.toDateString()) {
        return `Yesterday ${format(messageDate, "h:mm a")}`;
      }
      
      // Otherwise show full date and time
      return format(messageDate, "MMM d, h:mm a");
    } catch (error) {
      console.error("Error formatting message time:", error);
      return "";
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    if (message.createdAt) {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    }
    return groups;
  }, {} as Record<string, ChatMessage[]>);

  // Format last active time to human readable
  const formatLastActive = (lastActive: string | Date | null | undefined) => {
    if (!lastActive) return 'Offline';
    
    try {
      const lastActiveDate = new Date(lastActive);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60));
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      return format(lastActiveDate, 'MMM d');
    } catch (error) {
      console.error("Error formatting last active time:", error);
      return 'Unknown';
    }
  };

  // Handle connection error
  const handleRetryConnection = () => {
    setMessagesLoading(true);
    setLoadError(null);
    
    // Simulate reconnection
    setTimeout(() => {
      setIsConnected(true);
      setMessagesLoading(false);
      
      // Show success toast
      toast({
        title: "Connection restored",
        description: "You're back online.",
        variant: "default"
      });
    }, 1500);
  };

  return (
    <CardContent className="p-0 flex flex-col h-full">
      <div className="flex items-center justify-between p-2 md:p-4 border-b shrink-0">
        {selectedUser && (
          <>
            <div className="flex items-center">
              <Avatar className="h-8 w-8 md:h-10 md:w-10 mr-2 md:mr-3">
                <AvatarImage src={selectedUser.profileImage || ""} />
                <AvatarFallback>
                  {selectedUser.fullName?.charAt(0) || selectedUser.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-sm md:text-base flex items-center">
                  {selectedUser.fullName || selectedUser.username}
                  {selectedUser.verifiedDriver && (
                    <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-green-500 ml-1" />
                  )}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {selectedUser.lastActive && new Date(selectedUser.lastActive).getTime() > Date.now() - 5 * 60 * 1000 ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block"></span>
                      Online
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3" />
                      {formatLastActive(selectedUser.lastActive)}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 md:h-9 md:w-9">
                <PhoneCall className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 md:h-9 md:w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
        
        {selectedBooking && (
          <>
            <div className="flex items-center">
              <div className="bg-primary/10 h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center mr-2 md:mr-3">
                <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm md:text-base">
                  {selectedBooking.ride?.origin?.substring(0, 10)} → {selectedBooking.ride?.destination?.substring(0, 10)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedBooking.ride?.date ? format(new Date(selectedBooking.ride.date), 'MMM d, h:mm a') : 'No date'} • {selectedBooking.status}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-7 md:h-8">
              Ride Details
            </Button>
          </>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-gray-50/50 dark:bg-gray-900/10 min-h-[300px]">
        {loadError ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <h3 className="text-lg font-medium">Connection Error</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-xs">
              {loadError}
            </p>
            <Button 
              onClick={handleRetryConnection}
              variant="default"
              size="sm"
            >
              Retry Connection
            </Button>
          </div>
        ) : messagesLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <div className="flex space-x-2 justify-center mb-3">
                <div className="w-3 h-3 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-3 h-3 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-3 h-3 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-muted-foreground">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start the conversation by sending a message
            </p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date} className="space-y-2 md:space-y-3">
                <div className="flex justify-center">
                  <div className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-md">
                    {new Date(date).toDateString() === new Date().toDateString()
                      ? 'Today'
                      : new Date(date).toDateString() === new Date(Date.now() - 86400000).toDateString()
                      ? 'Yesterday'
                      : format(new Date(date), 'MMM d, yyyy')}
                  </div>
                </div>
                
                {dateMessages.map((message) => {
                  const isFromCurrentUser = message.senderId === user?.id;
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[85%] md:max-w-[80%] rounded-lg p-2 md:p-3 ${
                          isFromCurrentUser 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-background border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <p className="text-sm md:text-base">{message.content}</p>
                        <div 
                          className={`text-[10px] md:text-xs mt-1 ${
                            isFromCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}
                        >
                          {formatMessageTime(message.createdAt || new Date())}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-background border border-gray-200 dark:border-gray-700 rounded-lg p-2 md:p-3 max-w-[85%] md:max-w-[80%]">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-2 md:p-4 border-t bg-background shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleTyping}
            className="flex-1"
            disabled={!isConnected || !!loadError || messagesLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!newMessage.trim() || !isConnected || !!loadError || messagesLoading}
            className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </CardContent>
  );
}