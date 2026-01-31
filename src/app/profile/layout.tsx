import { ProtectedLayout } from "@/components/ProtectedLayout";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout requiredRole="CUSTOMER">{children}</ProtectedLayout>;
}
