import Link from "next/link";

export default function MenuNotFound() {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Restaurant not found</h1>
      <p className="text-muted-foreground text-sm">
        Check the QR code, slug, or restaurant ID, then scan again.
      </p>
      <Link href="/" className="text-sm underline">
        Back home
      </Link>
    </main>
  );
}
