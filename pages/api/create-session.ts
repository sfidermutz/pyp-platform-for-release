// pages/api/create-session.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { serialize } from "cookie";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("create-session missing Supabase env");
      return res.status(500).json({ error: "server misconfigured" });
    }

    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "token required" });

    // Validate token row (token string + is_active)
    const { data: tkn, error: tkErr } = await supabaseAdmin
      .from("tokens")
      .select("id, is_active")
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (tkErr || !tkn) {
      return res.status(401).json({ error: "invalid or inactive token" });
    }

    // Create session row referencing token
    const { data: session, error: sessErr } = await supabaseAdmin
      .from("sessions")
      .insert([{ token_id: tkn.id }])
      .select("id")
      .single();

    if (sessErr || !session) {
      console.error("create-session: failed to create session", sessErr);
      return res.status(500).json({ error: "failed to create session" });
    }

    // Set secure, HttpOnly cookie with the session id
    const cookie = serialize("pyp_session", session.id, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ ok: true, session_id: session.id });
  } catch (e) {
    console.error("create-session error", e);
    return res.status(500).json({ error: "server error" });
  }
}
