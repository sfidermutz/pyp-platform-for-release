// pages/api/logout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { serialize } from "cookie";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("logout missing Supabase env");
      res.setHeader("Set-Cookie", serialize("pyp_session", "", { httpOnly: true, path: "/", maxAge: 0 }));
      return res.status(500).json({ error: "server misconfigured" });
    }
    const sessionId = req.cookies?.["pyp_session"];
    if (sessionId) {
      try {
        await supabaseAdmin.from("sessions").delete().eq("id", sessionId);
      } catch (e) {
        console.warn("logout: failed to delete session", e);
      }
    }
    res.setHeader("Set-Cookie", serialize("pyp_session", "", { httpOnly: true, path: "/", maxAge: 0 }));
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("logout error", e);
    return res.status(500).json({ error: "server error" });
  }
}
