import { ProtectedLayout } from "@/components/ProtectedLayout";
import { VendorSidebar, VendorHeader } from "@/components/vendor/VendorSidebar";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedLayout requiredRole={["VENDOR", "ADMIN"]}>
      <div className="flex h-screen overflow-hidden bg-muted/30">
        <VendorSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <VendorHeader />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </ProtectedLayout>
  );
}
