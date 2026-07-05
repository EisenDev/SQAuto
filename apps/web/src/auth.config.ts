import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authConfig = {
  secret: process.env.AUTH_SECRET || "BPzBK2X54QAuW0KEfUlDBVPuxaIPn9YtXXtqKwmztZ4=",
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.name || undefined
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
      }
      return session
    },
  },
  providers: [
    CredentialsProvider({
      credentials: {
        username: {},
        password: {},
      },
      authorize() {
        return null
      }
    })
  ],
} satisfies NextAuthConfig

