"use server";

import { db } from "@/lib/db";
import { generatePasswordResetToken } from "@/lib/token";
import { sendPasswordResetEmail } from "@/lib/email";
import * as z from "zod";

const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

export const ForgotPassword = async (
  values: z.infer<typeof ForgotPasswordSchema>,
) => {
  const validation = ForgotPasswordSchema.safeParse(values);

  if (!validation.success) {
    return {
      error: validation.error.issues[0]?.message || "Validation error!",
      success: "",
    };
  }

  const { email } = validation.data;

  try {
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return {
        success:
          "If an account exists, a reset link has been sent to your email.",
        error: "",
      };
    }

    // Generate reset token
    const passwordResetToken = await generatePasswordResetToken(email);

    // Send reset email
    await sendPasswordResetEmail(email, passwordResetToken.token);

    return {
      success:
        "If an account exists, a reset link has been sent to your email.",
      error: "",
    };
  } catch (error) {
    console.error("Error in forgot password:", error);
    return {
      error: "Something went wrong. Please try again.",
      success: "",
    };
  }
};
