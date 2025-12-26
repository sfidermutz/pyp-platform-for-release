// pages/api/scenario/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

async function validateSessionId(sessionId?: string) {
  if (!supabaseAdmin || !sessionId) return false;
  const { data, error } = await supabaseAdmin.from("sessions").select("id, token_id").eq("id", sessionId).maybeSingle();
  if (error || !data) return false;
  if (!data.token_id) return true;
  const { data: token, error: tokenErr } = await supabaseAdmin.from("tokens").select("id, is_active").eq("id", data.token_id).maybeSingle();
  if (tokenErr || !token) return false;
  return Boolean(token.is_active);
}

async function validateTokenHeader(token?: string) {
  if (!supabaseAdmin || !token) return false;
  const { data, error } = await supabaseAdmin.from("tokens").select("id, is_active").eq("token", token).eq("is_active", true).maybeSingle();
  if (error || !data) return false;
  return true;
}

async function isAuthorized(req: NextApiRequest) {
  // cookie first
  const cookieSession = req.cookies?.["pyp_session"];
  if (cookieSession) {
    try {
      const ok = await validateSessionId(cookieSession);
      if (ok) return true;
    } catch (e) {
      console.error("[api/scenario] session validation error", e);
    }
  }

  // fallback to header token for API clients
  const tokenHeader =
    (req.headers["x-pyp-token"] as string) ||
    (req.headers["x-demo-token"] as string) ||
    (req.headers.authorization?.replace(/Bearer\s+/i, "") ?? "");
  if (tokenHeader) {
    try {
      const ok = await validateTokenHeader(tokenHeader);
      if (ok) return true;
    } catch (e) {
      console.error("[api/scenario] token validation error", e);
    }
  }

  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).json({ error: "scenario id required" });

  try {
    const authorized = await isAuthorized(req);
    if (!authorized) return res.status(403).json({ error: "unauthorized" });
  } catch (e) {
    console.error("[api/scenario] authorization failure", e);
    return res.status(500).json({ error: "server error" });
  }

  const filePath = path.join(process.cwd(), "data", "scenarios", `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(parsed);
  } catch (err: any) {
    if (err?.code === "ENOENT") return res.status(404).json({ error: "scenario not found" });
    console.error("[api/scenario] read error", err);
    return res.status(500).json({ error: "server error" });
  }
}
