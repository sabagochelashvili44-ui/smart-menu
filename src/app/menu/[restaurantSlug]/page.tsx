import { GuestMenuView } from "@/components/menu/guest-menu-view";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ restaurantSlug: string }>;
};

export default async function MenuSlugPage({ params }: PageProps) {
  const { restaurantSlug } = await params;
  return <GuestMenuView restaurantSlug={restaurantSlug} />;
}
