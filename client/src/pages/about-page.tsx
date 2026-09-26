import PageLayout from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listItemMotion, useMotionEnabled } from "@/lib/motion";
import { Github, Globe, Linkedin, Mail } from "lucide-react";
import { useEffect } from "react";

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

const CONTACTS = [
  { label: "Portfolio", href: "https://kashyappatel.vercel.app", icon: Globe },
  { label: "GitHub", href: "https://github.com/DeAtHfIrE26", icon: Github },
  { label: "LinkedIn", href: "https://linkedin.com/in/kashyap-patel2673", icon: Linkedin },
  { label: "Email", href: "mailto:kashyappatel2673@gmail.com", icon: Mail },
];

export default function AboutPage() {
  const motionOn = useMotionEnabled();

  // Client-side navigation does not act on a fragment, so arriving from the
  // footer's Contact link has to scroll to the section itself. scroll-mt on
  // the target keeps it clear of the sticky header.
  useEffect(() => {
    if (window.location.hash !== "#contact") return;

    // Two frames, so the cards above have been laid out before the offset is
    // measured. Scrolling on the first paint landed short of the section.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        document.getElementById("contact")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start",
        });
      });
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <h1 className="mb-2 text-2xl font-semibold">About this platform</h1>
        <p className="mb-8 text-muted-foreground">
          A carpooling application pairing ride sharing with a points-based
          incentive system. Drivers publish routes, passengers book seats, and
          completed trips earn points and a measured CO<sub>2</sub> figure
          computed from the distance actually travelled. It runs on React and
          Express with PostgreSQL through Drizzle, and deploys to Vercel as a
          serverless function beside a static client.
        </p>

        <div className="grid gap-4">
          {SECTIONS.map((section, index) => (
            <div key={section.title} {...listItemMotion(motionOn, index)}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  {section.body}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/*
          * The footer's Contact link points here rather than to a route of its
          * own, so there is one place holding this and no extra page to keep
          * in step with it.
          */}
        <section id="contact" className="mt-10 scroll-mt-20">
          <h2 className="text-lg font-semibold">About the builder</h2>
          <p className="mt-2 text-muted-foreground">
            Built by Kashyap Patel, a full-stack engineer working across .NET,
            React, Python and cloud, with a focus on fast, well-crafted systems.
          </p>

          <ul className="mt-4 flex flex-wrap gap-2">
            {CONTACTS.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageLayout>
  );
}
