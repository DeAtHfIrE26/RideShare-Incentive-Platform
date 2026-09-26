import { Link } from "wouter";

/**
 * A single line closing the page.
 *
 * The previous footer was a three-column marketing block, and because the shell
 * gave it a fixed slot it sat permanently across the lower third of the
 * viewport with the content cut off behind it. It also linked to /contact,
 * /careers, /help, /community, /terms, /privacy and /cookies — seven routes the
 * router does not define, so every one of them landed on the 404 page. The one
 * link it carries now goes to a section of a page that exists; everything else
 * it used to offer is in the navigation already.
 */
export function Footer() {
  return (
    <footer className="shrink-0 border-t px-4 py-4 text-xs text-muted-foreground sm:px-6">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} RideShare</p>
        <Link
          href="/about#contact"
          className="rounded-sm transition-colors hover:text-foreground hover:underline"
        >
          Contact
        </Link>
      </div>
    </footer>
  );
}
