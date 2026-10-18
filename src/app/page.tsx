import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 p-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Smart AI Menu
        </h1>
        <p className="text-muted-foreground mt-2">
          QR menus with an AI waiter for guests, and an admin panel for
          restaurants. Demo venue: Aurora Bistro.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Guest QR menu</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/menu/demo/table-1" className={cn(buttonVariants())}>
              Open sample table
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Restaurant admin</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Open admin panel
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
