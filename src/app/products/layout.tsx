import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Vendors and Admins should not access customer shopping pages
  if (session?.user?.role === "VENDOR") {
    redirect("/vendor/dashboard");
  }

  if (session?.user?.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  return <>{children}</>;
}
