"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";

import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { authClient } from "@/lib/auth-client";
import { signinSchema, type SigninSchemaT } from "../schemas";
import { trackLogin } from "@/lib/analytics";

interface SigninFormProps {
  type?: "agent" | "user";
}

export function SigninForm({
  className,
  ...props
}: SigninFormProps & React.ComponentProps<"div">) {
  const toastId = useId();
  const router = useRouter();

  const form = useForm<SigninSchemaT>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: "", password: "" }
  });

  const isInvalidCredentialsError = (message?: string) => {
    if (!message) return false;
    const n = message.toLowerCase();
    return n.includes("invalid") || n.includes("password") || n.includes("credentials");
  };

  const showInvalidCredentialsToast = () =>
    toast.error("Invalid email or password.", {
      id: toastId,
      description: "Double-check your credentials and try again.",
      action: { label: "Sign Up", onClick: () => router.push("/signup") }
    });

  const handleSignin = async (values: SigninSchemaT) => {
    try {
      toast.loading("Signing in…", { id: toastId });

      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (result?.error) {
        const msg = result.error.message || "";
        if (msg.toLowerCase().includes("not verified") || msg.toLowerCase().includes("verify")) {
          toast.error("Account not verified", {
            id: toastId,
            description: "Please contact support or try again in a moment.",
          });
          return;
        }
        if (isInvalidCredentialsError(msg)) { showInvalidCredentialsToast(); return; }
        throw new Error(msg);
      }

      toast.success("Welcome back!", { id: toastId, description: "Signed in successfully. Redirecting…" });
      trackLogin("email");

      const role = (result?.data?.user as { role?: string | null } | undefined)?.role;
      window.location.href = role === "admin" ? "/admin/users" : "/dashboard";
    } catch (err) {
      const error = err as Error;
      if (isInvalidCredentialsError(error.message)) { showInvalidCredentialsToast(); return; }
      console.error("[Signin] Error:", error);
      toast.error("Sign in failed.", { id: toastId, description: error.message });
    }
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="mb-7 text-center">
        <h1 className="font-playfair text-3xl font-bold text-brand-navy mb-1.5">
          Welcome Back
        </h1>
        <p className="text-sm text-brand-muted">
          Sign in to your Traveny account
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSignin)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-brand-body text-sm font-medium">Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="name@example.com"
                    className="rounded-xl border-brand-warm bg-white focus-visible:ring-gold/40 focus-visible:border-gold"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-brand-body text-sm font-medium">Password</FormLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-gold-dark hover:text-gold transition-colors underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput
                    placeholder="••••••••"
                    className="rounded-xl border-brand-warm bg-white focus-visible:ring-gold/40 focus-visible:border-gold"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-navy hover:bg-brand-navyMid text-white text-sm font-semibold tracking-wide transition-all duration-200 shadow-md shadow-brand-navy/20 disabled:opacity-60 mt-2"
          >
            <LogIn className="size-4" />
            {form.formState.isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </Form>

      <p className="mt-6 text-center text-sm text-brand-muted">
        Don't have an account?{" "}
        <Link href="/signup" className="text-gold-dark font-medium hover:text-gold underline-offset-4 hover:underline transition-colors">
          Create one
        </Link>
      </p>

      <p className="mt-8 text-center text-xs text-brand-muted/60">
        By signing in you agree to our{" "}
        <a href="#" className="underline underline-offset-4 hover:text-brand-muted">Terms</a>
        {" "}and{" "}
        <a href="#" className="underline underline-offset-4 hover:text-brand-muted">Privacy Policy</a>.
      </p>
    </div>
  );
}
