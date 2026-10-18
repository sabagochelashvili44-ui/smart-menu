import { brandCssText, type RestaurantBrandFields } from "@/lib/restaurant-brand";

export function BrandTheme({
  brand,
  children,
}: {
  brand: Partial<RestaurantBrandFields> | null;
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`:root { ${brandCssText(brand)} }`}</style>
      {children}
    </>
  );
}
