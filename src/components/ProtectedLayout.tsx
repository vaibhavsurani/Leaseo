import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

interface ProtectedLayoutProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  redirectTo?: string;
}

export async function ProtectedLayout({
  children,
  requiredRole,
  redirectTo,
}: ProtectedLayoutProps) {
  const session = await auth();

  // If no session, redirect to login
  if (!session?.user) {
    redirect("/auth/login");
  }

  // If role is specified, check if user has required role
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole];

    if (!allowedRoles.includes(session.user.role)) {
      // Redirect based on user's actual role
      const userRole = session.user.role;

      if (redirectTo) {
        redirect(redirectTo);
      } else if (userRole === "VENDOR") {
        redirect("/vendor/dashboard");
      } else if (userRole === "ADMIN") {
        redirect("/admin/dashboard");
      } else {
        redirect("/");
      }
    }
  }

  return <>{children}</>;
}

// Utility function to check role in client components
export function useUserProtection() {
  const session = useSessionClient();

  const canAccess = (requiredRoles?: UserRole | UserRole[]) => {
    if (!session?.user) return false;

    if (!requiredRoles) return true;

    const roles = Array.isArray(requiredRoles)
      ? requiredRoles
      : [requiredRoles];
    return roles.includes(session.user.role);
  };

  return {
    isAuthenticated: !!session?.user,
    role: session?.user?.role,
    canAccess,
  };
}

// Client-side hook import
import { useSession } from "next-auth/react";

function useSessionClient() {
  return useSession().data;
}
