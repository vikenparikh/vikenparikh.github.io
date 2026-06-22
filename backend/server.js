import { createServer } from "node:http";
import nodemailer from "nodemailer";

const PORT = parseInt(process.env.PORT || "8006", 10);
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const CONTACT_TO = process.env.CONTACT_TO || "";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "https://vikenparikh.com,https://vikenparikh.github.io")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const transporter = SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

// Per-IP token bucket. Keyed by X-Forwarded-For first hop, falls back to
// remoteAddress. In-memory — fine for personal scale; resets on container restart.
// Defaults: 20 sends / hour. Override via RATE_MAX_PER_HOUR + RATE_WINDOW_MINUTES.
const RATE_WINDOW_MS = parseInt(process.env.RATE_WINDOW_MINUTES || "60", 10) * 60 * 1000;
const RATE_MAX = parseInt(process.env.RATE_MAX_PER_HOUR || "20", 10);

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Build the request handler with injectable dependencies. Each instance owns its
// own rate-limit state so handlers don't share buckets. Defaults mirror the
// production environment-derived values so the live entrypoint is unchanged.
export function createHandler({
  transporter,
  contactTo,
  allowedOrigins = ALLOWED_ORIGINS,
  rateMax = RATE_MAX,
  rateWindowMs = RATE_WINDOW_MS,
  smtpUser = SMTP_USER,
} = {}) {
  const hits = new Map();
  function rateLimit(ip) {
    const now = Date.now();
    const arr = (hits.get(ip) || []).filter((t) => now - t < rateWindowMs);
    if (arr.length >= rateMax) return false;
    arr.push(now);
    hits.set(ip, arr);
    return true;
  }

  function cors(req, res) {
    const origin = req.headers.origin || "";
    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  return async (req, res) => {
    cors(req, res);
    if (req.method === "OPTIONS") return send(res, 204, {});
    if (req.method === "GET" && req.url === "/healthz") return send(res, 200, { status: "ok" });
    if (!(req.method === "POST" && (req.url === "/contact" || req.url?.startsWith("/contact?")))) {
      return send(res, 404, { detail: "not found" });
    }

    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 16_000) {
        req.destroy();
      }
    });
    req.on("end", async () => {
      let body;
      try {
        body = JSON.parse(raw || "{}");
      } catch {
        return send(res, 400, { detail: "invalid json" });
      }
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim();
      const message = String(body.message || "").trim();
      const hp = String(body._hp || "");
      if (hp) {
        // Honeypot tripped — 202 without sending; do not signal the trap.
        return send(res, 202, { status: "ok" });
      }
      if (!name || name.length > 120) return send(res, 400, { detail: "name required" });
      if (!email || !EMAIL_RE.test(email) || email.length > 254) return send(res, 400, { detail: "valid email required" });
      if (!message || message.length > 4000) return send(res, 400, { detail: "message required" });
      if (!rateLimit(clientIp(req))) return send(res, 429, { detail: "too many submissions, try later" });
      if (!transporter || !contactTo) {
        console.error("contact: SMTP not configured");
        return send(res, 503, { detail: "contact endpoint not configured" });
      }
      try {
        await transporter.sendMail({
          from: smtpUser,
          to: contactTo,
          replyTo: email,
          subject: `Portfolio contact from ${name}`,
          text: `From: ${name} <${email}>\n\n${message}\n`,
        });
        console.log(JSON.stringify({ event: "contact.sent", name }));
        return send(res, 202, { status: "ok" });
      } catch (e) {
        console.error("contact.send_failed", e?.message || e);
        return send(res, 502, { detail: "failed to deliver" });
      }
    });
  };
}

// Only start the server when run directly, so importing this module for tests
// is side-effect-free.
if (import.meta.url === `file://${process.argv[1]}`) {
  createServer(createHandler({ transporter, contactTo: CONTACT_TO }))
    .listen(PORT, () => console.log(`contact backend listening on :${PORT}`));
}
