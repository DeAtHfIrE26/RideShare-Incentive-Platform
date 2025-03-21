import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { createWebSocket } from "@/lib/ws";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Check } from "lucide-react";
import type { Message } from "@shared/schema";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function NotificationList() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Message[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch messages from API
  const { data: initialMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  // Mark message as read
  const markAsRead = async (messageId: number) => {
    try {
      const res = await apiRequest("POST", `/api/messages/${messageId}/read`, {});
      if (res.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(msg => msg.id === messageId ? { ...msg, isRead: true } : msg)
        );
        // Invalidate messages query
        queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/messages/unread"] });
      }
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };

  // Initialize notifications from fetched messages
  useEffect(() => {
    if (initialMessages) {
      setNotifications(initialMessages);
    }
  }, [initialMessages]);

  // Setup WebSocket connection for real-time notifications
  useEffect(() => {
    const ws = createWebSocket();
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if ((data.type === 'notification' || data.type === 'chat') && data.message) {
        // Only add if it's for the current user
        if (data.message.receiverId === user?.id) {
          setNotifications(prev => [data.message, ...prev]);
        }
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user?.id]);

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    if (notification.createdAt) {
      const date = new Date(notification.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notification);
    }
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-4">
          {Object.keys(groupedNotifications).length > 0 ? (
            Object.entries(groupedNotifications).map(([date, messages]) => (
              <div key={date} className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">
                  {new Date(date).toLocaleDateString(undefined, { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </h3>
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`p-3 rounded-lg border ${
                        message.isRead ? 'bg-background' : 'bg-primary/5 border-primary/20'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium">
                          {message.createdAt && format(new Date(message.createdAt), "h:mm a")}
                        </span>
                        {!message.isRead && (
                          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{message.content}</p>
                      {!message.isRead && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 h-8 text-xs"
                          onClick={() => markAsRead(message.id)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Mark as read
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 