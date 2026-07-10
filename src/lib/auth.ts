import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { SystemRole } from "@prisma/client";
import { authConfig } from "@/lib/auth.config";
import { authorizeInvitedGoogleUser, isGoogleAuthEnabled } from "@/lib/google-auth";
import {
  clearLoginThrottle,
  isLoginThrottled,
  loginThrottleKey,
  recordLoginFailure,
} from "@/lib/login-throttle";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const googleProvider =
  isGoogleAuthEnabled()
    ? Google({
        clientId: process.env.AUTH_GOOGLE_ID!,
        clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      })
    : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    ...(googleProvider ? [googleProvider] : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.trim().toLowerCase();
        const password = credentials?.password as string;

        if (!email || !password) return null;

        // Throttle here (not only in loginAction) so direct POSTs to the
        // NextAuth credentials endpoint cannot bypass the lockout.
        const throttleKey = loginThrottleKey(email);
        if (await isLoginThrottled(throttleKey)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) {
          await recordLoginFailure(throttleKey);
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          await recordLoginFailure(throttleKey);
          return null;
        }

        await clearLoginThrottle(throttleKey);

        if (adminEmails.includes(email) && user.systemRole !== SystemRole.ADMIN) {
          await prisma.user.update({
            where: { id: user.id },
            data: { systemRole: SystemRole.ADMIN },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const ok = await authorizeInvitedGoogleUser({
        user,
        account,
        name: user.name ?? (profile?.name as string | undefined),
        image: user.image ?? (profile?.picture as string | undefined),
      });

      if (!ok) return "/login?error=NotInvited";

      const email = user.email?.trim().toLowerCase();
      if (email && adminEmails.includes(email)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { systemRole: SystemRole.ADMIN },
        });
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            systemRole: true,
            hrAccess: true,
            name: true,
            email: true,
            image: true,
          },
        });
        // User row deleted — invalidate the session instead of degrading to
        // a regular user, so middleware redirects to /login.
        if (!dbUser) return null;
        token.systemRole = dbUser.systemRole;
        token.hrAccess = dbUser.hrAccess;
        token.name = dbUser.name;
        token.email = dbUser.email;
        token.picture = dbUser.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.systemRole = (token.systemRole as SystemRole) ?? SystemRole.USER;
        session.user.hrAccess = token.hrAccess === true;
        session.user.name = token.name ?? null;
        session.user.email = token.email ?? session.user.email;
        session.user.image = token.picture ?? null;
      }
      return session;
    },
  },
});
