import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { eq } from "drizzle-orm";

import { type Database } from "../database";
import * as authSchema from "../database/schema/auth.schema";
import { users } from "../database/schema";
import { admin, openAPI, emailOTP } from "better-auth/plugins";
import { sendEmail } from "../email/resend";
import {
  emailVerificationTemplate,
  forgotPasswordTemplate,
  passwordChangedTemplate,
  welcomeTemplate,
  emailVerificationOTPTemplate,
  forgotPasswordOTPTemplate,
  signInOTPTemplate,
} from "../email/templates";

export interface AuthConfigurations {
  database: Database;
  secret?: string;
  plugins?: Parameters<typeof betterAuth>[0]["plugins"];
}

export function configAuth(config: AuthConfigurations) {
  // isProduction is true on any Vercel deployment (preview or production) and in NODE_ENV=production.
  // Both Vercel environments are HTTPS and require secure/sameSite=none cookies.
  const isLocal =
    process.env.BETTER_AUTH_BASE_URL?.includes(".local") ||
    process.env.BETTER_AUTH_URL?.includes(".local") ||
    process.env.BETTER_AUTH_BASE_URL?.includes("localhost") ||
    process.env.BETTER_AUTH_URL?.includes("localhost") ||
    process.env.NODE_ENV !== "production";

  const isSecure =
    process.env.BETTER_AUTH_BASE_URL?.startsWith("https://") ||
    process.env.BETTER_AUTH_URL?.startsWith("https://") ||
    process.env.FRONTEND_URL?.startsWith("https://");

  const isProduction = !isLocal && (
    !!process.env.VERCEL_ENV ||
    process.env.NODE_ENV === "production"
  );

  const useSecureCookies = isProduction && isSecure;

  // Build dynamic trusted origins from env vars so Vercel preview URLs are always trusted.
  const dynamicOrigins: string[] = [];
  if (process.env.FRONTEND_URL) dynamicOrigins.push(process.env.FRONTEND_URL);
  if (process.env.CLIENT_URL) dynamicOrigins.push(process.env.CLIENT_URL);
  // VERCEL_URL is the raw host (no scheme) set automatically by Vercel at deploy time.
  if (process.env.VERCEL_URL) dynamicOrigins.push(`https://${process.env.VERCEL_URL}`);
  // For the API app, also trust the web app Vercel URL derived from the API URL pattern.
  if (process.env.VERCEL_URL?.includes('-api.vercel.app')) {
    dynamicOrigins.push(`https://${process.env.VERCEL_URL.replace('-api.vercel.app', '-web.vercel.app')}`);
  }

  const authConfig = {
    // Support both BETTER_AUTH_BASE_URL (docker-compose) and BETTER_AUTH_URL (legacy)
    baseURL: process.env.BETTER_AUTH_BASE_URL || process.env.BETTER_AUTH_URL,
    trustedOrigins: (request?: Request) => {
      const origin = request?.headers?.get("origin") || request?.headers?.get("referer");
      const allowed = [
        "http://localhost:3000",
        "http://localhost:4000",
        "http://traveny.local",
        "http://api.traveny.local",
        "https://traveny.local",
        "https://api.traveny.local",
        "https://traveny.com",
        "https://www.traveny.com",
        "https://api.traveny.com",
        ...dynamicOrigins
      ];

      if (origin && /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)) {
        allowed.push(origin);
      }

      return allowed;
    },

    database: drizzleAdapter(config.database, {
      provider: "pg",
      schema: authSchema,
      usePlural: true
    }),
    secret: config.secret,
    plugins: [
      admin(),
      openAPI(),
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        disableSignUp: false,
        sendVerificationOTP: async ({ email, otp, type }) => {
          try {
            if (typeof otp !== "string" || !otp) {
              console.error("[emailOTP] OTP is undefined or invalid");
              return;
            }

            let userName = email.split("@")[0];
            try {
              const [user] = await config.database
                .select({ name: users.name })
                .from(users)
                .where(eq(users.email, email))
                .limit(1);
              if (user?.name) userName = user.name;
            } catch (err) {
              console.log("[emailOTP] Could not fetch user name, using email:", err);
            }

            let subject = "";
            let html = "";
            
            if (type === "email-verification") {
              subject = "Your verification code";
              html = emailVerificationOTPTemplate({ name: userName, otp } as { name: string; otp: string });
            } else if (type === "forget-password") {
              subject = "Your Traveny password reset code";
              html = forgotPasswordOTPTemplate({ name: userName, otp } as { name: string; otp: string });
            } else if (type === "sign-in") {
              subject = "Your Traveny sign-in code";
              html = signInOTPTemplate({ name: userName, otp } as { name: string; otp: string });
            } else {
              subject = "Your Traveny verification code";
              html = emailVerificationOTPTemplate({ name: userName, otp } as { name: string; otp: string });
            }

            await sendEmail({
              to: email,
              subject,
              html,
              from: process.env.EMAIL_FROM_NOREPLY || "noreply@traveny.com",
            });

            console.log(`[emailOTP] Sent ${type} OTP to ${email}`);
          } catch (error) {
            console.error("[emailOTP] Failed to send OTP email:", error);
          }
        },
      }),
      ...(config.plugins || []),
    ],

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      requireEmailVerification: false,
      autoSignIn: true,
      sendVerificationEmail: async ({ user, url }: { user: any; url: string }) => {
        try {
          const userName = user.name || user.email.split("@")[0];
          const html = emailVerificationTemplate({
            name: userName,
            url: url,
          });
          await sendEmail({
            to: user.email,
            subject: "Verify your email address",
            html,
            from: process.env.EMAIL_FROM_NOREPLY || "noreply@traveny.com",
          });
        } catch (error) {
          console.error("[Auth] Failed to send verification email:", error);
        }
      },
      sendResetPassword: async ({ user, url }: { user: any; url: string }) => {
        try {
          const userName = user.name || user.email.split("@")[0];
          const html = forgotPasswordTemplate({
            name: userName,
            url: url,
          });
          await sendEmail({
            to: user.email,
            subject: "Reset your password",
            html,
            from: process.env.EMAIL_FROM_NOREPLY || "noreply@traveny.com",
          });
        } catch (error) {
          console.error("[Auth] Failed to send password reset email:", error);
        }
      },
    },

    socialProviders: (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
          }
        }
      : undefined),

    databaseHooks: {
      user: {
        create: {
          after: async (user: any) => {
            if (!user.role) {
              try {
                await config.database
                  .update(users)
                  .set({ role: "user" })
                  .where(eq(users.id, user.id));
                console.log("[Auth] Default role 'user' set for:", user.email);
              } catch (err) {
                console.error("[Auth] Failed to set default role:", err);
              }
            } else {
              console.log("[Auth] User created:", user.email, "role:", user.role);
            }
          },
        },
        update: {
          after: async (user: any) => {
            try {
              if (user.emailVerified === true) {
                console.log("[Auth] Email verified for user:", user.email);
                
                const userName = user.name || user.email.split("@")[0];
                const html = welcomeTemplate({ name: userName });
                await sendEmail({
                  to: user.email,
                  subject: "Welcome to Traveny 🎉",
                  html,
                  from: process.env.EMAIL_FROM_HELLO || "hello@traveny.com",
                });
                
                console.log("[Auth] Welcome email sent to:", user.email);
              }
            } catch (error) {
              console.error("[Auth] Failed to send welcome email:", error);
            }
          },
        },
      },
    },

    advanced: {
      cookies: {
        session_token: {
          attributes: {
            sameSite: (useSecureCookies ? "none" : "lax") as "none" | "lax",
            secure: useSecureCookies,
            httpOnly: true,
            path: "/"
          }
        }
      },
      crossSubDomainCookies: useSecureCookies && process.env.COOKIE_DOMAIN
        ? {
            enabled: true,
            domain: process.env.COOKIE_DOMAIN
          }
        : undefined,
      defaultCookieAttributes: {
        sameSite: (useSecureCookies ? "none" : "lax") as "none" | "lax",
        secure: useSecureCookies,
        httpOnly: true,
        path: "/"
      }
    }
  };

  const baseAuthInstance = betterAuth(authConfig);
  
  console.log("[Auth Config] BetterAuth instance created successfully", {
    baseURL: authConfig.baseURL,
    isProduction,
    crossSubDomainEnabled: authConfig.advanced?.crossSubDomainCookies?.enabled,
    cookieDomain: authConfig.advanced?.crossSubDomainCookies?.domain,
    sameSite: authConfig.advanced?.defaultCookieAttributes?.sameSite,
    secure: authConfig.advanced?.defaultCookieAttributes?.secure
  });

  return baseAuthInstance;
}

export type AuthInstance = ReturnType<typeof configAuth>;

export type Session = AuthInstance["$Infer"]["Session"]