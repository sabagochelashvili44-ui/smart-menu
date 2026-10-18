"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="space-y-3 p-6">
      <p className="text-sm">
        რესტორანი არ არის დაკავშირებული ამ ანგარიშთან
      </p>
      <Button type="button" size="sm" variant="outline" onClick={() => reset()}>
        Retry
      </Button>
    </section>
  );
}
