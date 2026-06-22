import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApp } from "./server.js";

// Spin up a real http.Server on an ephemeral port with an injected fake
// transporter so we exercise the streaming req.on('data'/'end') parsing path
// without any real outbound mail.

function makeFakeTransporter() {
  const calls = [];
  return {
    calls,
    sendMail: async (opts) => {
      calls.push(opts);
      return { messageId: "fake" };
    },
  };
}

function startServer(handler) {
  return new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

async function post(port, path, body, headers = {}) {
  return fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validPayload = { name: "Jane", email: "jane@example.com", message: "Hello there" };

// --- Suite 1: configured transporter (valid send + rate-limit + honeypot) ---
let cfgFake, cfgServer, cfgPort;
before(async () => {
  cfgFake = makeFakeTransporter();
  const handler = createApp({
    transporter: cfgFake,
    contactTo: "to@example.com",
    allowedOrigins: ["https://vikenparikh.com", "https://vikenparikh.github.io"],
  });
  ({ server: cfgServer, port: cfgPort } = await startServer(handler));
});
after(async () => {
  await closeServer(cfgServer);
});

test("GET /healthz -> 200 {status:ok}", async () => {
  const res = await fetch(`http://127.0.0.1:${cfgPort}/healthz`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok" });
});

test("OPTIONS /contact -> 204", async () => {
  const res = await fetch(`http://127.0.0.1:${cfgPort}/contact`, { method: "OPTIONS" });
  assert.equal(res.status, 204);
});

test("GET / (unmatched route) -> 404", async () => {
  const res = await fetch(`http://127.0.0.1:${cfgPort}/`);
  assert.equal(res.status, 404);
});

test("malformed JSON -> 400 invalid json", async () => {
  const res = await post(cfgPort, "/contact", "{not json");
  assert.equal(res.status, 400);
  assert.equal((await res.json()).detail, "invalid json");
});

test("missing/empty name -> 400 name required", async () => {
  const res = await post(cfgPort, "/contact", { ...validPayload, name: "" });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).detail, "name required");
});

test("name length 121 -> 400; length 120 -> not a name 400", async () => {
  const res121 = await post(cfgPort, "/contact", { ...validPayload, name: "a".repeat(121) });
  assert.equal(res121.status, 400);
  assert.equal((await res121.json()).detail, "name required");

  const res120 = await post(cfgPort, "/contact", { ...validPayload, name: "a".repeat(120) });
  // 120 is valid for name -> must not be the "name required" 400
  if (res120.status === 400) {
    assert.notEqual((await res120.json()).detail, "name required");
  }
});

test("invalid email nope -> 400 valid email required", async () => {
  const res = await post(cfgPort, "/contact", { ...validPayload, email: "nope" });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).detail, "valid email required");
});

test("email length 255 -> 400", async () => {
  // Valid shape but 255 chars total -> over the 254 cap.
  const local = "a".repeat(255 - "@example.com".length);
  const email = `${local}@example.com`;
  assert.equal(email.length, 255);
  const res = await post(cfgPort, "/contact", { ...validPayload, email });
  assert.equal(res.status, 400);
});

test("message: empty -> 400; 4001 -> 400; 4000 passes", async () => {
  const resEmpty = await post(cfgPort, "/contact", { ...validPayload, message: "" });
  assert.equal(resEmpty.status, 400);
  assert.equal((await resEmpty.json()).detail, "message required");

  const res4001 = await post(cfgPort, "/contact", { ...validPayload, message: "a".repeat(4001) });
  assert.equal(res4001.status, 400);
  assert.equal((await res4001.json()).detail, "message required");

  const res4000 = await post(cfgPort, "/contact", { ...validPayload, message: "a".repeat(4000) });
  // 4000 chars passes validation -> configured transporter sends -> 202
  assert.equal(res4000.status, 202);
});

test("honeypot _hp -> 202 and sendMail NOT called", async () => {
  const before = cfgFake.calls.length;
  const res = await post(cfgPort, "/contact", { ...validPayload, _hp: "bot" });
  assert.equal(res.status, 202);
  assert.deepEqual(await res.json(), { status: "ok" });
  assert.equal(cfgFake.calls.length, before, "honeypot must not trigger send");
});

// --- Suite 2: 503 when SMTP not configured (transporter:null) ---
test("valid payload, no SMTP -> 503", async () => {
  const handler = createApp({ transporter: null, contactTo: "" });
  const { server, port } = await startServer(handler);
  try {
    const res = await post(port, "/contact", validPayload);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).detail, "contact endpoint not configured");
  } finally {
    await closeServer(server);
  }
});

// --- Suite 3: rate limit (fresh per-app instance) ---
test("rate limit: 6 valid POSTs same IP -> 5 send, 6th 429", async () => {
  const fake = makeFakeTransporter();
  const handler = createApp({ transporter: fake, contactTo: "to@example.com" });
  const { server, port } = await startServer(handler);
  try {
    const headers = { "X-Forwarded-For": "203.0.113.7" };
    for (let i = 0; i < 5; i++) {
      const res = await post(port, "/contact", validPayload, headers);
      assert.equal(res.status, 202, `POST #${i + 1} should succeed`);
    }
    assert.equal(fake.calls.length, 5);
    const res6 = await post(port, "/contact", validPayload, headers);
    assert.equal(res6.status, 429);
    assert.equal((await res6.json()).detail, "too many submissions, try later");
    assert.equal(fake.calls.length, 5, "6th must not send");
  } finally {
    await closeServer(server);
  }
});

// --- Suite 4: CORS allowlist ---
test("CORS allowed origin -> header echoed; disallowed -> absent", async () => {
  const allowed = await fetch(`http://127.0.0.1:${cfgPort}/healthz`, {
    headers: { Origin: "https://vikenparikh.com" },
  });
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://vikenparikh.com");

  const denied = await fetch(`http://127.0.0.1:${cfgPort}/healthz`, {
    headers: { Origin: "https://evil.example" },
  });
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
});
