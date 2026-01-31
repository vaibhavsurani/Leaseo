"use server";

import { SigninSchema } from "@/lib";
import { db } from "@/lib/db";
import { generateVerificationToken } from "@/lib/token";
import * as z from "zod";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/lib/email";

export const Signin = async (
  values: z.infer<typeof SigninSchema>,
  callbackUrl?: string | null,
) => {
  const validationeddFields = SigninSchema.safeParse(values);

  if (validationeddFields.error) return { error: "Invalid fields!" };

  const { email, password } = validationeddFields.data;

  const existingUser = await db.user.findUnique({
    where: {
      email,
    },
  });

  // Check if user exists
  if (!existingUser || !existingUser.email || !existingUser.password) {
    return { error: "Invalid User ID or Password." };
  }

  // Check if user is active
  if (!existingUser.isActive) {
    return {
      error: "Your account has been deactivated. Please contact support.",
    };
  }

  // Verify password first
  const isPasswordValid = await bcrypt.compare(password, existingUser.password);

  if (!isPasswordValid) {
    return { error: "Invalid User ID or Password." };
  }

  // Check email verification
  if (!existingUser.emailVerified) {
    const verificationToken = await generateVerificationToken(
      existingUser.email,
    );

    try {
      await sendVerificationEmail(
        verificationToken.email,
        verificationToken.token,
        existingUser.firstName || "User",
      );
    } catch (error) {
      console.error("Verification email failed:", error);
    }

    return { error: "Email not verified. Confirmation email sent!" };
  }

  return { success: true, role: existingUser.role };
};
