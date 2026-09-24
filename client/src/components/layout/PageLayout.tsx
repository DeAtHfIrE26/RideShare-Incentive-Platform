import { cn } from "@/lib/utils";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import Sidebar from "./sidebar";

const COLLAPSE_KEY = "rideshare.sidebar.collapsed";

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "true";
  } catch {
    return false;
  }
}

type PageLayoutProps = {
  children: ReactNode;
  showFooter?: boolean;
};

/**
 * The application shell.
 *
 * The page scrolls, rather than a fixed-height <main> scrolling inside a
 * viewport-sized box. The old shell sized main to the full height of its
 * parent and then placed the footer after it, which pushed the footer into a
 * permanent band across the bottom of the screen with the content clipped
 * behind it. Here the footer is the last thing in a min-h-screen column, so it
 * sits below the content on a long page and at the bottom of the window on a
 * short one.
 *
 * The rail's collapsed state lives here because the padding that keeps the
 * content clear of the rail has to change with it. It is remembered across
 * navigations and reloads.
 */
export default function PageLayout({ children, showFooter = true }: PageLayoutProps) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      // A browser with storage disabled just loses the preference.
    }
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((value) => !value), []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-16" : "lg:pl-64",
        )}
      >
        <Header />
        <main className="flex-1">{children}</main>
        {showFooter && <Footer />}
      </div>
    </div>
  );
}
