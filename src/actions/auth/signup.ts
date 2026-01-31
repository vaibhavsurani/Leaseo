"use server";

import { getUserByEmail } from "@/data/user";
import { RegisterSchema } from "@/lib";
import { db } from "@/lib/db";
import { generateVerificationToken } from "@/lib/token";
import * as z from "zod";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/lib/email";

export const Register = async (values: z.infer<typeof RegisterSchema>) => {
  const validation = RegisterSchema.safeParse(values);

  if (validation.error) return { error: "Error!", success: "" };

  console.log("Register data", validation.data);

  const { email, password, firstName, lastName } = validation.data;

  const name = `${firstName} ${lastName}`;

  const existinguser = await getUserByEmail(email);

  if (existinguser) return { error: "User already exist!", success: "" };

  const hashedPassord = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassord,
    },
  });

  const verificationToken = await generateVerificationToken(email);

  try {
    if (existinguser) return { error: "User already exist!", success: "" };
    await sendVerificationEmail(
      verificationToken.email,
      verificationToken.token,
      name
    );
  } catch (error) {
    console.error("Error while sending Verification Mail:", error);
    return { error: "Failed to send verification email. Check server logs.", success: "" };
  }
  return { success: "Confirmation email sent!" };
};
