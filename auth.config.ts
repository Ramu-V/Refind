import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim(),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          accent: user.accent,
        };
      },
    }),
  ],
  session: { strategy: "jwt" as const },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role;
        token.accent = (user as { accent?: string }).accent;
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "student";
        session.user.accent = (token.accent as string) ?? "#1e3a8a";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
