"use server";
import { getUserByEmail } from "@/data/user";
import { getVerifationTokenByToken } from "@/data/verification-token";
import { db } from "@/lib/db";
import { signIn } from "@/auth";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";

export const newVerification = async (token: string) => {
  const existingToken = await getVerifationTokenByToken(token);

  if (!existingToken) {
    return { error: "Token does not exist!" };
  }

  const hasExpired = new Date(existingToken.expires) < new Date();

  if (hasExpired) {
    return { error: "Token has expited!" };
  }

  const existingUser = await getUserByEmail(existingToken.email);

  if (!existingUser) {
    return { error: "User does not exist!" };
  }

  if (existingUser.emailVerified) {
    return { error: "Email already verified!" };
  }

  if (existingUser.image !== null) {
    return { error: "You are registered with google" };
  }

  try {
    await db.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        emailVerified: new Date(),
      },
    });

    // NOTE: We do NOT delete the token here anymore.
    // Instead, we pass it to signIn, and 'authorize' will delete it upon successful login.
  } catch (e) {
    return { error: "Error in EmailVerification" };
  }

  // Auto-login the user
  await signIn("credentials", {
    email: existingToken.email,
    token: existingToken.token,
    redirectTo: DEFAULT_LOGIN_REDIRECT,
  });

  return { success: "Email verified!" };
};
