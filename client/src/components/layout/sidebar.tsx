import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Award, Car, ChevronLeft, ChevronRight, Home, Info, LogOut, MessageSquare, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

// Define the type for navigation items
type NavItem = {
  name: string;
  href: string;
  icon: React.FC<{ className?: string }>;
  activePaths?: string[];
};

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get unread notification count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = unreadData?.count || 0;

  const navigation: NavItem[] = [
    { name: "Home", href: "/", icon: Home },
    { name: "Rides", href: "/rides", icon: Car },
    { name: "Messages", href: "/chat", icon: MessageSquare, activePaths: ["/chat", "/messages"] },
    { name: "Rewards", href: "/rewards", icon: Award },
    { name: "Safety", href: "/safety", icon: Shield },
    { name: "Profile", href: "/profile", icon: User },
    { name: "About", href: "/about", icon: Info },
  ];

  // Auto-collapse on small screens
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  return (
    <div className={`flex flex-col fixed inset-y-0 left-0 z-50 ${
      collapsed ? 'w-0 sm:w-16' : 'w-64'
    } bg-sidebar border-r transition-all duration-300`}>
      <div className={`flex items-center justify-between h-16 px-4 border-b ${
        collapsed && isMobile ? 'hidden sm:flex' : ''
      }`}>
        {!collapsed && (
          <>
            <Car className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg ml-2 flex-1">Kary</span>
          </>
        )}
        {collapsed && !isMobile && <Car className="h-6 w-6 mx-auto text-primary" />}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className={`ml-auto ${collapsed && isMobile ? 'hidden sm:flex' : ''}`}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
      </div>

      <ScrollArea className={`flex-1 px-2 py-4 ${
        collapsed && isMobile ? 'hidden sm:block' : ''
      }`}>
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.activePaths && item.activePaths.includes(location));
            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {!collapsed && (
                    <>
                      {item.name}
                      {item.name === "Messages" && unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-auto text-xs h-5 min-w-5 flex items-center justify-center">
                          {unreadCount}
                        </Badge>
                      )}
                    </>
                  )}
                  {collapsed && item.name === "Messages" && unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto text-xs h-5 min-w-5 flex items-center justify-center">
                      {unreadCount}
                    </Badge>
                  )}
                </a>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {!collapsed ? (
        <div className="p-4 border-t">
          <Link href="/profile">
            <a className="flex items-center gap-3 mb-4 p-2 rounded-md hover:bg-sidebar-accent/30 transition-colors">
              <Avatar>
                <AvatarImage src={user?.profileImage || ""} />
                <AvatarFallback className="bg-primary/10">
                  {user?.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.fullName || user?.username}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs mr-1 px-1 py-0">
                    {user?.points || 0} pts
                  </Badge>
                  {user?.verifiedDriver && (
                    <Badge variant="outline" className="text-xs ml-1 px-1 py-0 bg-green-50 text-green-700 border-green-200">
                      Driver
                    </Badge>
                  )}
                </div>
              </div>
            </a>
          </Link>
          
          <div className="grid grid-cols-2 gap-2">
            <Link href="/profile">
              <a>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
              </a>
            </Link>
            
            <Button 
              variant="outline" 
              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" 
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      ) : (
        <div className={`py-4 border-t flex justify-center ${
          collapsed && isMobile ? 'hidden sm:flex' : ''
        }`}>
          <Link href="/profile">
            <a>
              <Avatar className="cursor-pointer">
                <AvatarImage src={user?.profileImage || ""} />
                <AvatarFallback className="bg-primary/10">
                  {user?.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </a>
          </Link>
        </div>
      )}
    </div>
  );
}