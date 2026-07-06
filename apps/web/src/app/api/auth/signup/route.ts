import { NextResponse } from "next/server"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

// Sanitize DATABASE_URL from python+psycopg structure to standard postgresql://
const connectionString = process.env.DATABASE_URL?.replace('postgresql+psycopg', 'postgresql') || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('sslmode=require') || connectionString?.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
})

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body." },
        { status: 400 }
      )
    }

    const { username, password } = body

    // 1. Validation
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      )
    }

    // username: 3-20 chars, alphanumeric + underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Username must be 3-20 characters long and contain only alphanumeric characters and underscores." 
        },
        { status: 400 }
      )
    }

    // password minimum 8 chars
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    try {
      // Check if username already exists
      const checkRes = await client.query(
        "SELECT id FROM users WHERE username = $1",
        [username]
      )
      if (checkRes.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: "Username is already taken." },
          { status: 409 }
        )
      }

      // Hash password with bcryptjs
      const passwordHash = await bcrypt.hash(password, 12)

      // Insert into users table
      const insertRes = await client.query(
        "INSERT INTO users (id, username, password_hash) VALUES (gen_random_uuid(), $1, $2) RETURNING id, username",
        [username, passwordHash]
      )

      return NextResponse.json(
        { success: true, user: insertRes.rows[0] },
        { status: 201 }
      )
    } finally {
      client.release()
    }
  } catch (err: any) {
    console.error("Signup error:", err)
    return NextResponse.json(
      { success: false, error: "Internal Server Error." },
      { status: 500 }
    )
  }
}
