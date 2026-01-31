"use server";

import { RegisterSchema, VendorRegisterSchema } from "@/lib/index";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import * as z from "zod";
import { generateVerificationToken } from "@/lib/token";
import { sendVerificationEmail } from "@/lib/email";

// Customer Registration
export const Register = async (values: z.infer<typeof RegisterSchema>) => {
  const validation = RegisterSchema.safeParse(values);

  if (!validation.success) {
    return {
      error: validation.error.issues[0]?.message || "Validation error!",
      success: "",
    };
  }

  const { firstName, lastName, email, password, couponCode } = validation.data;

  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        error: "Email already in use!",
        success: "",
      };
    }

    // Validate coupon code if provided
    if (couponCode) {
      const coupon = await db.coupon.findUnique({
        where: { code: couponCode },
      });

      if (!coupon) {
        return {
          error: "Invalid coupon code!",
          success: "",
        };
      }

      if (
        !coupon.isActive ||
        coupon.validFrom > new Date() ||
        coupon.validUntil < new Date()
      ) {
        return {
          error: "Coupon code has expired!",
          success: "",
        };
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return {
          error: "Coupon code usage limit reached!",
          success: "",
        };
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: "CUSTOMER",
        couponCode: couponCode || null,
      },
    });

    // Update coupon usage if used
    if (couponCode) {
      await db.coupon.update({
        where: { code: couponCode },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Generate verification token and send email
    const verificationToken = await generateVerificationToken(email);
    await sendVerificationEmail(email, verificationToken.token, firstName);

    return {
      success:
        "Account created! Please check your email to verify your account.",
      error: "",
    };
  } catch (error) {
    console.error("Error registering user:", error);
    return {
      error: "Something went wrong. Please try again.",
      success: "",
    };
  }
};

// Vendor Registration
export const RegisterVendor = async (
  values: z.infer<typeof VendorRegisterSchema>,
) => {
  const validation = VendorRegisterSchema.safeParse(values);

  if (!validation.success) {
    return {
      error: validation.error.issues[0]?.message || "Validation error!",
      success: "",
    };
  }

  const {
    firstName,
    lastName,
    companyName,
    productCategory,
    gstin,
    email,
    password,
  } = validation.data;

  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        error: "Email already in use!",
        success: "",
      };
    }

    // Check if GSTIN is already registered
    const existingGstin = await db.user.findFirst({
      where: { gstin },
    });

    if (existingGstin) {
      return {
        error: "GSTIN already registered!",
        success: "",
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create vendor user with profile
    const user = await db.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: "VENDOR",
        companyName,
        gstin,
        vendorProfile: {
          create: {
            businessName: companyName,
            gstNumber: gstin,
          },
        },
      },
    });

    // Generate verification token and send email
    const verificationToken = await generateVerificationToken(email);
    await sendVerificationEmail(email, verificationToken.token, firstName);

    return {
      success:
        "Vendor account created! Please check your email to verify your account.",
      error: "",
    };
  } catch (error) {
    console.error("Error registering vendor:", error);
    return {
      error: "Something went wrong. Please try again.",
      success: "",
    };
  }
};
