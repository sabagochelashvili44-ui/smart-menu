import { GuestMenuView } from "@/components/menu/guest-menu-view";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ restaurantSlug: string; tableNumber: string }>;
};

export default async function MenuNamedTablePage({ params }: PageProps) {
  const { restaurantSlug, tableNumber } = await params;
  return (
    <GuestMenuView
      restaurantSlug={restaurantSlug}
      tableId={decodeURIComponent(tableNumber)}
    />
  );
}
