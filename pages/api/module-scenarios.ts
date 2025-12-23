// pages/api/module-scenarios.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";
import { createClient } from "@supabase/supabase-js";
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
  if (!supabaseAdmin) return false;
  const cookieSession = req.cookies?.["pyp_session"];
  if (cookieSession) {
    try {
      const ok = await validateSessionId(cookieSession);
      if (ok) return true;
    } catch (e) {
      console.error("[api/module-scenarios] session validation error", e);
    }
  }

  const tokenHeader =
    (req.headers["x-pyp-token"] as string) ||
    (req.headers["x-demo-token"] as string) ||
    (req.headers.authorization?.replace(/Bearer\s+/i, "") ?? "");
  if (tokenHeader) {
    try {
      const ok = await validateTokenHeader(tokenHeader);
      if (ok) return true;
    } catch (e) {
      console.error("[api/module-scenarios] token validation error", e);
    }
  }
  return false;
}

async function tryGithubScanForModule(moduleId: string) {
  try {
    const apiUrl = "https://api.github.com/repos/sfidermutz/pyp-platform-for-release/contents/data/scenarios";
    console.log("[api] github listing url", apiUrl);
    const res = await fetch(apiUrl);
    if (!res.ok) return [];
    const listing = await res.json();
    if (!Array.isArray(listing)) return [];

    const matches: any[] = [];
    for (const item of listing) {
      if (!item || !item.name || !item.download_url) continue;
      if (!item.name.toLowerCase().endsWith(".json")) continue;
      try {
        const r = await fetch(item.download_url);
        if (!r.ok) {
          console.warn("[api] remote file fetch failed", item.download_url, r.status);
          continue;
        }
        const raw = await r.text();
        const parsed = JSON.parse(raw);
        const mid = parsed?.moduleId ?? parsed?.module_id ?? parsed?.module ?? parsed?.moduleCode ?? parsed?.moduleCode;
        if (mid && String(mid).toLowerCase() === String(moduleId).toLowerCase()) {
          matches.push({
            filename: item.name,
            scenario_id: parsed?.scenario_id ?? parsed?.scenarioId ?? parsed?.id ?? null,
            title: parsed?.title ?? parsed?.name ?? "",
            role: parsed?.role ?? "",
            learningOutcome: parsed?.learningOutcome ?? parsed?.scenario_LO ?? parsed?.scenarioLO ?? "",
            narrative: parsed?.narrative ?? parsed?.situation ?? ""
          });
        }
      } catch (e) {
        console.warn("[api] remote parse exception", item.name, String(e));
        continue;
      }
    }
    return matches;
  } catch (e) {
    console.warn("[api] tryGithubScanForModule error", String(e));
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method not allowed" });
  }

  if (!supabaseAdmin) {
    console.error("[api/module-scenarios] Supabase env not configured");
    return res.status(403).json({ error: "unauthorized" });
  }

  try {
    const moduleQ = (req.query.module as string) || (req.query.moduleId as string) || (req.query.module_id as string);
    if (!moduleQ) return res.status(400).json({ error: "missing module query parameter" });
    const moduleId = moduleQ;

    const authorized = await isAuthorized(req);
    if (!authorized) return res.status(403).json({ error: "unauthorized" });

    const repoRoot = process.cwd();
    const scenariosDir = path.join(repoRoot, "data", "scenarios");

    let files: string[] = [];
    try {
      files = await fs.readdir(scenariosDir);
    } catch (err) {
      console.warn("[api] scenarios dir not found locally, will attempt remote scan", String(err));
      const remoteMatches = await tryGithubScanForModule(moduleId);
      return res.status(200).json({ scenarios: remoteMatches });
    }

    const results: any[] = [];
    for (const f of files) {
      if (!f.toLowerCase().endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(scenariosDir, f), "utf8");
        const parsed = JSON.parse(raw);
        const mid = parsed?.moduleId ?? parsed?.module_id ?? parsed?.module ?? parsed?.moduleCode ?? parsed?.moduleCode;
        if (mid && String(mid).toLowerCase() === String(moduleId).toLowerCase()) {
          results.push({
            filename: f,
            scenario_id: parsed?.scenario_id ?? parsed?.scenarioId ?? parsed?.id ?? null,
            title: parsed?.title ?? parsed?.name ?? "",
            role: parsed?.role ?? "",
            learningOutcome: parsed?.learningOutcome ?? parsed?.scenario_LO ?? parsed?.scenarioLO ?? "",
            narrative: parsed?.narrative ?? parsed?.situation ?? ""
          });
        }
      } catch (e) {
        console.warn("[api] skipping scenario file due to parse error", f, String(e));
        continue;
      }
    }

    if (results.length === 0) {
      const remoteMatches = await tryGithubScanForModule(moduleId);
      return res.status(200).json({ scenarios: remoteMatches });
    }

    results.sort((a, b) => {
      const ai = (a.scenario_id || "").toString();
      const bi = (b.scenario_id || "").toString();
      if (!ai && !bi) return 0;
      if (!ai) return 1;
      if (!bi) return -1;
      return ai.localeCompare(bi);
    });

    return res.status(200).json({ scenarios: results });
  } catch (e) {
    console.error("[api] module-scenarios error", String(e));
    return res.status(500).json({ error: "server error" });
  }
}
