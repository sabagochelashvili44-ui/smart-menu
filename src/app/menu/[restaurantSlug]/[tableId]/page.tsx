import { GuestMenuView } from "@/components/menu/guest-menu-view";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ restaurantSlug: string; tableId: string }>;
};

export default async function MenuTablePage({ params }: PageProps) {
  const { restaurantSlug, tableId } = await params;
  return <GuestMenuView restaurantSlug={restaurantSlug} tableId={tableId} />;
}
