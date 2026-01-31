"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import * as z from "zod";

// Password validation: 6-12 characters, uppercase, lowercase, special character (@, $, &, _)
const passwordValidation = new RegExp(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[@$&_])[A-Za-z\d@$&_]{6,12}$/,
);

const ChangePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "Current password is required!" }),
    newPassword: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" })
      .max(12, { message: "Password must be at most 12 characters" })
      .regex(passwordValidation, {
        message:
          "Password must include uppercase, lowercase, and special character (@, $, &, _)",
      }),
    confirmPassword: z
      .string()
      .min(1, { message: "Confirm password is required!" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const ChangePassword = async (
  values: z.infer<typeof ChangePasswordSchema>,
) => {
  const validation = ChangePasswordSchema.safeParse(values);

  if (!validation.success) {
    return {
      error: validation.error.issues[0]?.message || "Validation error!",
      success: "",
    };
  }

  const { currentPassword, newPassword } = validation.data;

  try {
    // Get current session
    const session = await auth();

    if (!session?.user?.id) {
      return {
        error: "You must be logged in to change your password.",
        success: "",
      };
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.password) {
      return {
        error: "User not found or password not set.",
        success: "",
      };
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      return {
        error: "Current password is incorrect.",
        success: "",
      };
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return {
        error: "New password must be different from current password.",
        success: "",
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isPasswordChanged: true,
      },
    });

    return {
      success: "Password changed successfully!",
      error: "",
    };
  } catch (error) {
    console.error("Error changing password:", error);
    return {
      error: "Something went wrong. Please try again.",
      success: "",
    };
  }
};
