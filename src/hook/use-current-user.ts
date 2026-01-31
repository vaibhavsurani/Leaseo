import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";

type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
};

export function useCurrentUserClient(): {
  user: User | null | undefined;
  status: "loading" | "authenticated" | "unauthenticated";
} {
  const session = useSession();
  //@ts-ignore
  return { user: session.data?.user ?? null, status: session.status };
}
