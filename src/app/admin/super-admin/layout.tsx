import { BrandTheme } from "@/components/brand-theme";

/** Super-admin UI uses default brand tokens, not the layout's active manager tenant. */
export default function SuperAdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BrandTheme brand={null}>{children}</BrandTheme>;
}
