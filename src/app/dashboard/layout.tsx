import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect unauthenticated users to login
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Vendors should go to vendor dashboard
  if (session.user.role === "VENDOR") {
    redirect("/vendor/dashboard");
  }

  // Admins should go to admin dashboard
  if (session.user.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  return <>{children}</>;
}
