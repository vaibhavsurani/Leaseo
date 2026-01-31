"use client";

import { CardWrapper } from "./card-wrapper";
import { Signin } from "@/actions/auth/login";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SigninSchema } from "@/lib";
import * as z from "zod";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import Link from "next/link";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const searchparams = useSearchParams();
  const callbackUrl = searchparams.get("callbackUrl");
  const router = useRouter();

  const form = useForm<z.infer<typeof SigninSchema>>({
    resolver: zodResolver(SigninSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof SigninSchema>) => {
    const toastId = toast.loading("Logging in...");

    startTransition(async () => {
      try {
        const data = await Signin(values, callbackUrl);

        if (data?.error) {
          toast.error(data.error, { id: toastId, closeButton: true });
          return;
        }

        await signIn("credentials", {
          email: values.email,
          password: values.password,
          redirect: false,
        });

        toast.success("Logged in successfully!", {
          id: toastId,
          closeButton: true,
        });

        // Redirect based on role
        if (data.role === "VENDOR") {
          router.push(callbackUrl || "/vendor/dashboard");
        } else if (data.role === "ADMIN") {
          router.push(callbackUrl || "/admin/dashboard");
        } else {
          router.push(callbackUrl || DEFAULT_LOGIN_REDIRECT);
        }
      } catch (err: any) {
        toast.error("Invalid User ID or Password.", {
          id: toastId,
          closeButton: true,
        });
      }
    });
  };

  return (
    <CardWrapper
      headerLabel="Login"
      headerdescription="Enter your credentials to access your account"
      backButtonHref="/auth/signup"
      backButtonLable="Don't have an account? Register Here"
      isDisabled={isPending}
      showSocial={false}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            disabled={isPending}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Login ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your email"
                    type="email"
                    {...field}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            disabled={isPending}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="Enter your password"
                      {...field}
                      disabled={isPending}
                      type={isPasswordVisible ? "text" : "password"}
                    />
                    <button
                      className="absolute bottom-0 right-0 h-10 px-3 pt-1 text-center text-gray-500"
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
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

          <Button disabled={isPending} type="submit" className="w-full mt-4">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            Log In
          </Button>

          <div className="text-center">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
        </form>
      </Form>
    </CardWrapper>
  );
}
