import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
      <h1 className="text-4xl font-light mb-4 tracking-tight">404</h1>
      <p className="text-muted-foreground mb-8 text-sm tracking-wide">Signal lost. The orb is dark.</p>
      <Link href="/" className="px-6 py-2.5 rounded-full border border-border hover:bg-secondary transition-colors text-xs font-medium tracking-widest uppercase">
        Return Home
      </Link>
    </div>
  );
}
