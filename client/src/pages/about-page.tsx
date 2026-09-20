import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  {
    title: "Ride sharing",
    body: "Drivers publish a route with a departure time, seat count and price. Passengers browse open rides and book the seats they need.",
  },
  {
    title: "Rewards",
    body: "Completed rides accrue points. Points are recorded per user with a type and description, and are visible on the rewards page.",
  },
  {
    title: "Safety",
    body: "Riders can register trusted contacts, raise alerts during a ride, share live location with the driver, and verify a ride with a one-time code.",
  },
  {
    title: "Messaging",
    body: "Passengers and drivers exchange messages tied to a booking. Delivery is over a WebSocket connection with unread counts in the sidebar.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">About this platform</h1>
      <p className="mb-8 text-muted-foreground">
        A carpooling application pairing ride sharing with a points-based
        incentive system.
      </p>

      <div className="grid gap-4">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              {section.body}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
