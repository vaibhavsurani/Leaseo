import { ProtectedLayout } from "@/components/ProtectedLayout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout requiredRole="ADMIN">{children}</ProtectedLayout>;
}
