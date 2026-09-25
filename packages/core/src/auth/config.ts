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

  const isProduction = !isLocal && (
    !!process.env.VERCEL_ENV ||
    process.env.NODE_ENV === "production"
  );

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
    trustedOrigins: [
      "http://localhost:3000",
      "http://localhost:4000",
      // Local Minikube domains
      "http://traveny.local",
      "http://api.traveny.local",
      "https://traveny.local",
      "https://api.traveny.local",
      // Production domains
      "https://traveny.com",
      "https://www.traveny.com",
      "https://api.traveny.com",
      // Vercel deployment URLs (stable)
      ...dynamicOrigins
    ].filter((v, i, arr) => typeof v === "string" && arr.indexOf(v) === i) as string[],
    // Trust request origin dynamically in dev/staging/IP deployments
    allowAnyOrigin: !isProduction || !!process.env.ALLOW_ANY_ORIGIN,

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
        expiresIn: 600, // 10 minutes in seconds
        disableSignUp: false,
        sendVerificationOTP: async ({ email, otp, type }) => {
          try {
            // Validate OTP - early return if undefined
            if (typeof otp !== "string" || !otp) {
              console.error("[emailOTP] OTP is undefined or invalid");
              return;
            }

            // Get user name from database for personalization
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

            // Select template and subject based on type
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
              // Fallback for any other type
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
      requireEmailVerification: false, // TEMP: disabled — re-enable for production
      autoSignIn: true,
      // Email verification hook
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
      // Password reset hook
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

    // Configure Google OAuth as an object
    socialProviders: (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
          }
        }
      : undefined),

    // Database hooks for lifecycle events
    databaseHooks: {
      user: {
        create: {
          after: async (user: any) => {
            // Default role to "user" for all new sign-ups.
            // Admin-created users will have an explicit role already set by the plugin.
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
              // Check if emailVerified was just set to true
              // Send welcome email only after successful email verification
              if (user.emailVerified === true) {
                console.log("[Auth] Email verified for user:", user.email);
                
                // Send welcome email
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
            // SameSite=none requires Secure (HTTPS). Use lax for HTTP dev.
            sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
            secure: isProduction,
            httpOnly: true,
            // DO NOT use partitioned - it causes cookie isolation issues
            // where cookies are stored per-partition and can't be read consistently
            // Set path to "/" so cookie is available across entire domain
            path: "/"
          }
        }
      },
      // Cross-subdomain cookies: only set when COOKIE_DOMAIN env var is explicitly configured.
      // - Local dev: not set (proxy handles same-origin cookies).
      // - Vercel *.vercel.app: NOT set — web and API are on different vercel.app subdomains;
      //   the Next.js proxy  at /api/[[...path]] strips the Domain attribute so cookies work.
      // - Custom domain (e.g., traveny.com + api.traveny.com):
      //   set COOKIE_DOMAIN=.traveny.com in the API's Vercel environment variables.
      crossSubDomainCookies: isProduction && process.env.COOKIE_DOMAIN
        ? {
            enabled: true,
            domain: process.env.COOKIE_DOMAIN
          }
        : undefined,
      // IMPORTANT: When domain is not set (localhost), cookies are tied to exact origin
      // This means cookies from backend:4000 won't work on frontend:3000
      // That's why we use the proxy - so cookies appear to come from :3000
      defaultCookieAttributes: {
        // SameSite=none requires Secure=true. On HTTP localhost, use lax.
        sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
        secure: isProduction,
        httpOnly: true,
        // REMOVED: partitioned - causes session null issues after signin
        // The partitioned attribute isolates cookies per top-level site,
        // which breaks session persistence in cross-origin scenarios
        // Ensure cookies are available across the entire domain
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