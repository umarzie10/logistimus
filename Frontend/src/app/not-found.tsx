import Link from "next/link";
import { Logo } from "@/components/marketing/Logo";
import { Button } from "@/components/marketing/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-ice">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center">
          <Link href="/" aria-label="Logistimus home">
            <Logo />
          </Link>
        </div>
      </header>

      <main
        id="main"
        className="container-page flex flex-1 flex-col items-center justify-center py-20 text-center"
      >
        <p className="type-mono text-muted">ERROR 404</p>
        <h1 className="type-display mt-5">This route is not on the map.</h1>
        <p className="type-body mx-auto mt-5 text-muted">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-9">
          <Button href="/">Back to the homepage</Button>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="container-page py-8">
          <p className="text-sm text-muted">© 2026 Logistimus. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
