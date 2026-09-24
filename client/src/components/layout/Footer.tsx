/**
 * A single line closing the page.
 *
 * The previous footer was a three-column marketing block, and because the shell
 * gave it a fixed slot it sat permanently across the lower third of the
 * viewport with the content cut off behind it. It also linked to /contact,
 * /careers, /help, /community, /terms, /privacy and /cookies — seven routes the
 * router does not define, so every one of them landed on the 404 page. Every
 * destination it offered is in the navigation already, so it carries no links.
 */
export function Footer() {
  return (
    <footer className="shrink-0 border-t px-4 py-4 text-xs text-muted-foreground sm:px-6">
      <p>© {new Date().getFullYear()} RideShare</p>
    </footer>
  );
}
