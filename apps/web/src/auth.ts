import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"

// Sanitize DATABASE_URL from python+psycopg structure to standard postgresql://
const connectionString = process.env.DATABASE_URL?.replace('postgresql+psycopg', 'postgresql') || process.env.DATABASE_URL;

let pool: any = null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("NextAuth authorize called with credentials:", credentials ? { username: credentials.username } : null);
        let client = null;
        try {
          if (!credentials?.username || !credentials?.password) {
            return null;
          }

          const username = credentials.username as string;
          const password = credentials.password as string;

          if (!pool) {
            const { Pool } = await import("pg");
            pool = new Pool({
              connectionString,
              ssl: connectionString?.includes('sslmode=require') || connectionString?.includes('supabase')
                ? { rejectUnauthorized: false }
                : undefined,
            });
          }

          client = await pool.connect();
          const res = await client.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
          );
          const user = res.rows[0];
          if (!user) {
            return null;
          }

          const bcrypt = await import("bcryptjs");
          const isValid = await bcrypt.compare(password, user.password_hash);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.username,
            email: user.email || `${user.username}@sqauto.local`,
          };
        } catch (err) {
          console.error("Auth error during authorize:", err);
          return null;
        } finally {
          if (client) {
            client.release();
          }
        }
      }
    }),
    // TODO: add GitHub and Google providers here later
  ]
})

