"use server";

import { db } from "@/lib/db";
import { getPasswordResetTokenByToken } from "@/lib/token";
import bcrypt from "bcryptjs";
import * as z from "zod";

// Password validation: 6-12 characters, uppercase, lowercase, special character (@, $, &, _)
const passwordValidation = new RegExp(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[@$&_])[A-Za-z\d@$&_]{6,12}$/,
);

const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, { message: "Token is required" }),
    newPassword: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" })
      .max(12, { message: "Password must be at most 12 characters" })
      .regex(passwordValidation, {
        message:
          "Password must include uppercase, lowercase, and special character (@, $, &, _)",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const ResetPassword = async (
  values: z.infer<typeof ResetPasswordSchema>,
) => {
  const validation = ResetPasswordSchema.safeParse(values);

  if (!validation.success) {
    return {
      error: validation.error.issues[0]?.message || "Validation error!",
      success: "",
    };
  }

  const { token, newPassword } = validation.data;

  try {
    // Get token from database
    const passwordResetToken = await getPasswordResetTokenByToken(token);

    if (!passwordResetToken) {
      return {
        error: "Invalid or expired reset token!",
        success: "",
      };
    }

    // Check if token has expired
    const hasExpired = new Date(passwordResetToken.expires) < new Date();

    if (hasExpired) {
      // Delete expired token
      await db.token.delete({
        where: { id: passwordResetToken.id },
      });

      return {
        error: "Reset token has expired. Please request a new one.",
        success: "",
      };
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: passwordResetToken.email },
    });

    if (!user) {
      return {
        error: "User not found!",
        success: "",
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isPasswordChanged: true,
      },
    });

    // Delete used token
    await db.token.delete({
      where: { id: passwordResetToken.id },
    });

    return {
      success: "Password has been reset successfully!",
      error: "",
    };
  } catch (error) {
    console.error("Error resetting password:", error);
    return {
      error: "Something went wrong. Please try again.",
      success: "",
    };
  }
};
