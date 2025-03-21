import { Link } from "wouter";
import { Icons } from "@/components/ui/icons";

export function Footer() {
  return (
    <footer className="border-t py-6 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <Link href="/">
              <a className="flex items-center gap-2 font-bold text-lg text-primary">
                <Icons.shield className="h-5 w-5" />
                <span>CarpoolRewards</span>
              </a>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
            <div>
              <h3 className="font-medium mb-2 text-sm">Company</h3>
              <ul className="space-y-1">
                <li><Link href="/about"><a className="text-xs hover:underline">About</a></Link></li>
                <li><Link href="/contact"><a className="text-xs hover:underline">Contact</a></Link></li>
                <li><Link href="/careers"><a className="text-xs hover:underline">Careers</a></Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-sm">Support</h3>
              <ul className="space-y-1">
                <li><Link href="/help"><a className="text-xs hover:underline">Help Center</a></Link></li>
                <li><Link href="/safety"><a className="text-xs hover:underline">Safety Center</a></Link></li>
                <li><Link href="/community"><a className="text-xs hover:underline">Community</a></Link></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h3 className="font-medium mb-2 text-sm">Legal</h3>
              <ul className="space-y-1">
                <li><Link href="/terms"><a className="text-xs hover:underline">Terms of Service</a></Link></li>
                <li><Link href="/privacy"><a className="text-xs hover:underline">Privacy Policy</a></Link></li>
                <li><Link href="/cookies"><a className="text-xs hover:underline">Cookie Policy</a></Link></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} CarpoolRewards. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
} 