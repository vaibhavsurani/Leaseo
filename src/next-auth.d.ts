import NextAuth, { type DefaultSession } from "next-auth";
import { UserRole } from "@prisma/client";

export type ExtendedUser = DefaultSession["user"] & {
  id: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  image: string | null;
};

declare module "next-auth" {
  interface Session {
    user: ExtendedUser;
  }

  interface User {
    id: string;
    role: UserRole;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    image: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    image: string | null;
  }
}
