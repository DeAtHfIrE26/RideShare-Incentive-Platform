import { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import Sidebar from "./sidebar";

type PageLayoutProps = {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  fullWidthOnMobile?: boolean;
};

export default function PageLayout({ 
  children, 
  showHeader = true, 
  showFooter = true,
  fullWidthOnMobile = false
}: PageLayoutProps) {
  return (
    <div className="flex h-screen min-h-screen bg-background">
      <Sidebar />
      <div className={`flex-1 ${
        fullWidthOnMobile 
          ? 'ml-0 sm:ml-16 lg:ml-64' 
          : 'ml-16 md:ml-64'
      } transition-all duration-300 flex flex-col h-full`}>
        {showHeader && <Header />}
        <main className="flex-1 overflow-auto relative h-[calc(100%-var(--header-height,0px)-var(--footer-height,0px))]">
          {children}
        </main>
        {showFooter && <Footer />}
      </div>
    </div>
  );
} 