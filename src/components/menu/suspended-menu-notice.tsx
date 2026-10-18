export function SuspendedMenuNotice({ restaurantName }: { restaurantName: string }) {
  return (
    <main className="bg-background mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground text-sm">{restaurantName}</p>
      <h1 className="text-xl font-semibold tracking-tight">
        მომსახურება დროებით შეჩერებულია. გთხოვთ დაუკავშირდეთ ადმინისტრაციას.
      </h1>
    </main>
  );
}
