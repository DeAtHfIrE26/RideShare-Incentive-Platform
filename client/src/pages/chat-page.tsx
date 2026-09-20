import ChatWindow from "@/components/chat/chat-window";
import PageLayout from "@/components/layout/PageLayout";
import NotificationList from "@/components/notifications/notification-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Booking } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Mirrors the ExtendedBooking shape chat-window expects: a booking plus the
 * optional joined ride the API may attach.
 */
type ExtendedBooking = Booking & {
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

export default function ChatPage() {
  const [selected, setSelected] = useState<ExtendedBooking | null>(null);

  const { data: bookings, isLoading } = useQuery<ExtendedBooking[]>({
    queryKey: ["/api/bookings"],
  });

  return (
    <PageLayout showFooter={false}>
      <div className="grid h-full gap-4 p-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : bookings && bookings.length > 0 ? (
                bookings.map((booking) => (
                  <Button
                    key={booking.id}
                    variant="ghost"
                    className={cn(
                      "h-auto w-full justify-start px-3 py-2 text-left",
                      selected?.id === booking.id && "bg-accent",
                    )}
                    onClick={() => setSelected(booking)}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {booking.ride
                          ? `${booking.ride.origin} to ${booking.ride.destination}`
                          : `Booking #${booking.id}`}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {booking.status ?? "pending"}
                      </p>
                    </div>
                  </Button>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No bookings yet. Book a ride to start a conversation.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationList />
            </CardContent>
          </Card>
        </div>

        <Card className="flex min-h-[28rem] flex-col">
          {selected ? (
            <ChatWindow selectedUser={null} selectedBooking={selected} />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-muted-foreground">
              Select a conversation to start messaging.
            </div>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}
