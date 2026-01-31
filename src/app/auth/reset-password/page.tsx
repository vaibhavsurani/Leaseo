"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ResetPassword } from "@/actions/auth/reset-password";
import { ResetPasswordSchema } from "@/lib";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  KeyRound,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      toast.error("Invalid reset link. Please request a new password reset.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await ResetPassword({
        token,
        newPassword: values.password,
        confirmPassword: values.confirmPassword,
      });

      if (result.error) {
        toast.error(result.error);
      }

      if (result.success) {
        setIsSuccess(true);
        toast.success(result.success);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="flex h-screen items-center justify-center mx-4">
      <Card className="w-[400px] shadow-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Reset Password</CardTitle>
          <CardDescription>
            {isSuccess
              ? "Your password has been reset successfully"
              : "Enter your new password below"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="space-y-4">
              <div className="rounded-md bg-red-50 border border-red-200 p-4 text-center">
                <p className="text-sm text-red-700">
                  Invalid reset link. Please request a new password reset.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/auth/forgot-password">Request New Reset Link</Link>
              </Button>
            </div>
          ) : isSuccess ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-sm text-muted-foreground text-center">
                  Your password has been reset successfully. Redirecting to
                  login...
                </p>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="password"
                  disabled={isLoading}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Enter new password"
                            {...field}
                            disabled={isLoading}
                            type={isPasswordVisible ? "text" : "password"}
                          />
                          <button
                            className="absolute bottom-0 right-0 h-10 px-3 pt-1 text-center text-gray-500"
                            onClick={() =>
                              setIsPasswordVisible(!isPasswordVisible)
                            }
                            type="button"
                          >
                            {isPasswordVisible ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  disabled={isLoading}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Confirm new password"
                            {...field}
                            disabled={isLoading}
                            type={
                              isConfirmPasswordVisible ? "text" : "password"
                            }
                          />
                          <button
                            className="absolute bottom-0 right-0 h-10 px-3 pt-1 text-center text-gray-500"
                            onClick={() =>
                              setIsConfirmPasswordVisible(
                                !isConfirmPasswordVisible,
                              )
                            }
                            type="button"
                          >
                            {isConfirmPasswordVisible ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Password requirements:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>6-12 characters</li>
                    <li>At least one uppercase letter (A-Z)</li>
                    <li>At least one lowercase letter (a-z)</li>
                    <li>At least one special character (@, $, &amp;, _)</li>
                  </ul>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  Reset Password
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Link
            href="/auth/login"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </section>
  );
}
