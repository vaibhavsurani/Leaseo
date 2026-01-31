"use client";

import { CardWrapper } from "./card-wrapper";
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
import { RegisterSchema } from "@/lib";
import * as z from "zod";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Register } from "@/actions/auth/register";
import Link from "next/link";

export function RegisterForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      couponCode: "",
    },
  });

  const onSubmit = (values: z.infer<typeof RegisterSchema>) => {
    const toastId = toast.loading("Creating your account...");

    startTransition(() => {
      Register(values)
        .then((data: { success?: string; error?: string }) => {
          if (data.error) {
            toast.error(data.error, {
              closeButton: true,
              id: toastId,
            });
          } else {
            toast.success(data.success, {
              closeButton: true,
              id: toastId,
            });
            form.reset();
          }
        })
        .catch((error) => {
          toast.error("Something went wrong!", {
            closeButton: true,
            id: toastId,
          });
        });
    });
  };

  return (
    <CardWrapper
      headerLabel="Create an Account"
      headerdescription="Sign up to get started"
      backButtonHref="/auth/login"
      backButtonLable="Already have an account?"
      isDisabled={isPending}
      showSocial={false}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              disabled={isPending}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              disabled={isPending}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            disabled={isPending}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="john@example.com"
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

          <FormField
            control={form.control}
            name="confirmPassword"
            disabled={isPending}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="Confirm your password"
                      {...field}
                      disabled={isPending}
                      type={isConfirmPasswordVisible ? "text" : "password"}
                    />
                    <button
                      className="absolute bottom-0 right-0 h-10 px-3 pt-1 text-center text-gray-500"
                      onClick={() =>
                        setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
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

          <FormField
            control={form.control}
            name="couponCode"
            disabled={isPending}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Coupon Code (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter coupon code"
                    {...field}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button disabled={isPending} type="submit" className="w-full mt-4">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Register
          </Button>

          <div className="text-center text-sm">
            <Link
              href="/auth/vendor-signup"
              className="text-primary hover:underline font-medium"
            >
              Become a vendor
            </Link>
          </div>
        </form>
      </Form>
    </CardWrapper>
  );
}
