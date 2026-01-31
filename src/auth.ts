import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./lib/db";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { SigninSchema } from "./lib";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  events: {
    async linkAccount({ user }) {
      try {
        await db.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      } catch (error) {
        console.error(
          "Failed to update emailVerified during linkAccount:",
          error,
        );
      }
    },
  },

  callbacks: {
    async jwt({ token, user, trigger, session: updateSession }) {
      // Handle session update (e.g., when profile image changes)
      if (trigger === "update" && updateSession) {
        if (updateSession.image) {
          token.image = updateSession.image;
        }
        if (updateSession.firstName) {
          token.firstName = updateSession.firstName;
        }
        if (updateSession.lastName) {
          token.lastName = updateSession.lastName;
        }
      }

      // Initial sign in - user object is passed
      if (user) {
        token.id = user.id;
        // Fetch user details from database
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: {
            role: true,
            firstName: true,
            lastName: true,
            companyName: true,
            image: true,
          },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.companyName = dbUser.companyName;
          token.image = dbUser.image;
        }
      }

      // If token exists but role is missing, fetch from database
      if (token.id && !token.role) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            firstName: true,
            lastName: true,
            companyName: true,
            image: true,
          },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.companyName = dbUser.companyName;
          token.image = dbUser.image;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.companyName = token.companyName as string | null;
        session.user.image = token.image as string | null;
      }
      return session;
    },

    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const existingUser = await db.user.findUnique({
            // @ts-ignore
            where: { email: user?.email },
          });

          if (existingUser) {
            if (!existingUser.emailVerified) {
              await db.user.update({
                where: { id: existingUser.id },
                data: { emailVerified: new Date() },
              });
            }

            return true;
          } else {
            return true;
          }
        } catch (error) {
          console.error("Error in Google sign in:", error);
          return false;
        }
      }

      try {
        const existingUser = await db.user.findUnique({
          where: { id: user.id },
        });

        // Prevent sign in without email verification
        if (!existingUser || !existingUser.emailVerified) return false;

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
  },
  session: { strategy: "jwt" },
  // @ts-ignore - Adapter type mismatch between next-auth and @auth/prisma-adapter versions
  adapter: PrismaAdapter(db),
  providers: [
    ...authConfig.providers!,
    Credentials({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any) {
        const validatedFields = SigninSchema.safeParse(credentials);

        if (validatedFields.error) return null;

        const { email, password } = validatedFields.data;

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) return null;

        return user;
      },
    }),
  ],
});
