import * as z from "zod";

// Password validation: 6-12 characters, uppercase, lowercase, special character (@, $, &, _)
const passwordValidation = new RegExp(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[@$&_])[A-Za-z\d@$&_]{6,12}$/,
);

export const SigninSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export const RegisterSchema = z
  .object({
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" })
      .max(12, { message: "Password must be at most 12 characters" })
      .regex(passwordValidation, {
        message:
          "Password must include uppercase, lowercase, and special character (@, $, &, _)",
      }),
    confirmPassword: z
      .string()
      .min(1, { message: "Please confirm your password" }),
    couponCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const VendorRegisterSchema = z
  .object({
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    companyName: z.string().min(1, { message: "Company name is required" }),
    productCategory: z
      .string()
      .min(1, { message: "Please select a product category" }),
    gstin: z
      .string()
      .min(15, { message: "Please enter a valid GSTIN" })
      .max(15),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" })
      .max(12, { message: "Password must be at most 12 characters" })
      .regex(passwordValidation, {
        message:
          "Password must include uppercase, lowercase, and special character (@, $, &, _)",
      }),
    confirmPassword: z
      .string()
      .min(1, { message: "Please confirm your password" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

export const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" })
      .max(12, { message: "Password must be at most 12 characters" })
      .regex(passwordValidation, {
        message:
          "Password must include uppercase, lowercase, and special character (@, $, &, _)",
      }),
    confirmPassword: z
      .string()
      .min(1, { message: "Please confirm your password" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const ChangePasswordSchema = z
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
