import { ProtectedLayout } from "@/components/ProtectedLayout";

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout requiredRole="CUSTOMER">{children}</ProtectedLayout>;
}
