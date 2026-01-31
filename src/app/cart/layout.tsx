import { ProtectedLayout } from "@/components/ProtectedLayout";

export default async function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout requiredRole="CUSTOMER">{children}</ProtectedLayout>;
}
