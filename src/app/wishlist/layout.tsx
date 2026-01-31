import { ProtectedLayout } from "@/components/ProtectedLayout";

export default async function WishlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout requiredRole="CUSTOMER">{children}</ProtectedLayout>;
}
