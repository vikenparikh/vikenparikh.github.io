import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHandler } from "./server.js";

// Spin up an ephemeral http server bound to the handler under test, run one
// request, tear it down. Keeps each test fully isolated (fresh handler => fresh
// rate-limit state).
function withServer(handler, fn) {
  return new Promise((resolve, reject) => {
    const srv = createServer(handler);
    srv.listen(0, "127.0.0.1", async () => {
      const { port } = srv.address();
      try {
        const result = await fn(port);
        srv.close(() => resolve(result));
      } catch (e) {
        srv.close(() => reject(e));
      }
    });
  });
}

function request(port, { method = "GET", path = "/", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const r = httpRequest(
      { host: "127.0.0.1", port, method, path, headers },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () =>
          resolve({ status: res.statusCode, headers: res.headers, raw })
        );
      }
    );
    r.on("error", reject);
    if (body !== undefined) r.write(body);
    r.end();
  });
}

function fakeTransporter() {
  const calls = [];
  return {
    calls,
    sendMail: async (m) => {
      calls.push(m);
      return {};
    },
  };
}

const BASE = {
  contactTo: "owner@example.com",
  allowedOrigins: ["https://vikenparikh.com"],
  rateMax: 20,
  rateWindowMs: 60 * 60 * 1000,
};

function validBody(over = {}) {
  return JSON.stringify({
    name: "Alice",
    email: "a@b.co",
    message: "hello there",
    ...over,
  });
}

const JSON_HEADERS = { "Content-Type": "application/json" };

// 1. GET /healthz -> 200 {status:"ok"}
test("GET /healthz returns 200 ok", async () => {
  const t = fakeTransporter();
  await withServer(createHandler({ transporter: t, ...BASE }), async (port) => {
    const res = await request(port, { method: "GET", path: "/healthz" });
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(res.raw), { status: "ok" });
  });
});

// 2. unknown route GET /nope -> 404 ; OPTIONS -> 204
test("unknown GET route 404, OPTIONS 204", async () => {
  const t = fakeTransporter();
  await withServer(createHandler({ transporter: t, ...BASE }), async (port) => {
    const notFound = await request(port, { method: "GET", path: "/nope" });
    assert.equal(notFound.status, 404);
    const opt = await request(port, { method: "OPTIONS", path: "/contact" });
    assert.equal(opt.status, 204);
  });
});

// 3. valid POST /contact -> 202 ok AND sendMail once with to=contactTo, replyTo=email
test("valid POST sends mail once with correct to/replyTo", async () => {
  const t = fakeTransporter();
  await withServer(createHandler({ transporter: t, ...BASE }), async (port) => {
    const res = await request(port, {
      method: "POST",
      path: "/contact",
      headers: JSON_HEADERS,
      body: validBody(),
    });
    assert.equal(res.status, 202);
    assert.deepEqual(JSON.parse(res.raw), { status: "ok" });
    assert.equal(t.calls.length, 1);
    assert.equal(t.calls[0].to, BASE.contactTo);
    assert.equal(t.calls[0].replyTo, "a@b.co");
  });
});

// 4. honeypot: non-empty _hp -> 202 AND sendMail NOT called
test("honeypot tripped -> 202 and no send", async () => {
  const t = fakeTransporter();
  await withServer(createHandler({ transporter: t, ...BASE }), async (port) => {
    const res = await request(port, {
      method: "POST",
      path: "/contact",
      headers: JSON_HEADERS,
      body: validBody({ _hp: "bot" }),
    });
    assert.equal(res.status, 202);
    assert.deepEqual(JSON.parse(res.raw), { status: "ok" });
    assert.equal(t.calls.length, 0);
  });
});

// 5. invalid JSON body -> 400 {detail:"invalid json"}
test("invalid JSON -> 400 invalid json", async () => {
  const t = fakeTransporter();
  await withServer(createHandler({ transporter: t, ...BASE }), async (port) => {
    const res = await request(port, {
      method: "POST",
      path: "/contact",
      headers: JSON_HEADERS,
      body: "{not json",
    });
    assert.equal(res.status, 400);
    assert.deepEqual(JSON.parse(res.raw), { detail: "invalid json" });
  });
});

// 6. missing name / invalid email / blank message -> 400 with per-branch detail
test("validation branches return correct 400 details", async () => {
  const t = fakeTransporter();
  await withServer(createHandler({ transporter: t, ...BASE }), async (port) => {
    const noName = await request(port, {
      method: "POST",
      path: "/contact",
      headers: JSON_HEADERS,
      body: validBody({ name: "   " }),
    });
    assert.equal(noName.status, 400);
    assert.deepEqual(JSON.parse(noName.raw), { detail: "name required" });

    const badEmail = await request(port, {
      method: "POST",
      path: "/contact",
      headers: JSON_HEADERS,
      body: validBody({ email: "bad" }),
    });
    assert.equal(badEmail.status, 400);
    assert.deepEqual(JSON.parse(badEmail.raw), { detail: "valid email required" });

    const noMsg = await request(port, {
      method: "POST",
      path: "/contact",
      headers: JSON_HEADERS,
      body: validBody({ message: "  " }),
    });
    assert.equal(noMsg.status, 400);
    assert.deepEqual(JSON.parse(noMsg.raw), { detail: "message required" });

    assert.equal(t.calls.length, 0);
  });
});

// 7. email regex: "bad" and "@b.co" rejected (400); "a@b.co" accepted (reaches send)
test("email regex accepts a@b.co, rejects bad and @b.co", async () => {
  const t1 = fakeTransporter();
  await withServer(createHandler({ transporter: t1, ...BASE }), async (port) => {
    const r = await request(port, {
      method: "POST",
      path: "/contact",
      headers: JSON_HEADERS,
      body: validBody({ email: "bad" }),
    });
    assert.equal(r.status, 400);
  });

  const t2 = fakeTransporter();
  await withServer(createHandler({ transporter: t2, ...BASE }), async (port) => {
    const r = await request(port, {
      method: "POST",
      path: "/contact",
      headers: JSON_HEADERS,
      body: validBody({ email: "@b.co" }),
    });
    assert.equal(r.status, 400);
  });

  const t3 = fakeTransporter();
  await withServer(createHandler({ transporter: t3, ...BASE }), async (port) => {
    const r = await request(port, {
      method: "POST",
      path: "/contact",
      headers: JSON_HEADERS,
      body: validBody({ email: "a@b.co" }),
    });
    assert.equal(r.status, 202);
    assert.equal(t3.calls.length, 1);
  });
});

// 8. rate-limit: rateMax=1, second POST same IP -> 429
test("rate-limit second submission -> 429", async () => {
  const t = fakeTransporter();
  await withServer(
    createHandler({ transporter: t, ...BASE, rateMax: 1 }),
    async (port) => {
      const ip = { "X-Forwarded-For": "203.0.113.7" };
      const first = await request(port, {
        method: "POST",
        path: "/contact",
        headers: { ...JSON_HEADERS, ...ip },
        body: validBody(),
      });
      assert.equal(first.status, 202);
      const second = await request(port, {
        method: "POST",
        path: "/contact",
        headers: { ...JSON_HEADERS, ...ip },
        body: validBody(),
      });
      assert.equal(second.status, 429);
      assert.deepEqual(JSON.parse(second.raw), {
        detail: "too many submissions, try later",
      });
    }
  );
});

// 9. unconfigured SMTP (transporter null) on valid POST -> 503
test("null transporter -> 503 not configured", async () => {
  await withServer(
    createHandler({ transporter: null, ...BASE }),
    async (port) => {
      const res = await request(port, {
        method: "POST",
        path: "/contact",
        headers: JSON_HEADERS,
        body: validBody(),
      });
      assert.equal(res.status, 503);
      assert.deepEqual(JSON.parse(res.raw), {
        detail: "contact endpoint not configured",
      });
    }
  );
});

// A. CORS match (covers server.js 68-70): an allowed Origin echoes
// Access-Control-Allow-Origin and adds Vary: Origin.
test("CORS allowed origin echoes ACAO and Vary", async () => {
  const t = fakeTransporter();
  // sanity: the origin we send must be in the allow-list under test
  assert.ok(BASE.allowedOrigins.includes("https://vikenparikh.com"));
  await withServer(createHandler({ transporter: t, ...BASE }), async (port) => {
    const res = await request(port, {
      method: "POST",
      path: "/contact",
      headers: { ...JSON_HEADERS, Origin: "https://vikenparikh.com" },
      body: validBody(),
    });
    assert.equal(res.status, 202);
    assert.equal(
      res.headers["access-control-allow-origin"],
      "https://vikenparikh.com"
    );
    assert.ok(String(res.headers["vary"] || "").includes("Origin"));
    assert.equal(t.calls.length, 1);
  });
});

// B. 16KB body cap (covers server.js 88-89): a >16KB body trips req.destroy(),
// so the client never gets a clean response — the socket errors out. The test
// passing (without hanging) is the evidence the cap branch executed. A short
// per-test timeout guards against a regression that would hang instead.
test("oversized body trips 16KB cap (req.destroy)", { timeout: 4000 }, async () => {
  const t = fakeTransporter();
  await withServer(createHandler({ transporter: t, ...BASE }), async (port) => {
    let rejected = false;
    try {
      await request(port, {
        method: "POST",
        path: "/contact",
        headers: JSON_HEADERS,
        body: "x".repeat(20000),
      });
    } catch {
      // Expected: server destroyed the socket mid-stream -> client request errors.
      rejected = true;
    }
    assert.ok(rejected, "expected client request to error after req.destroy()");
    assert.equal(t.calls.length, 0);
  });
});

// C. 502 send-failure (covers server.js 125-127): transporter.sendMail throws,
// handler responds 502 {detail:"failed to deliver"}.
test("sendMail failure -> 502 failed to deliver", async () => {
  const throwing = {
    sendMail: async () => {
      throw new Error("smtp down");
    },
  };
  await withServer(
    createHandler({ transporter: throwing, ...BASE }),
    async (port) => {
      const res = await request(port, {
        method: "POST",
        path: "/contact",
        headers: JSON_HEADERS,
        body: validBody(),
      });
      assert.equal(res.status, 502);
      assert.deepEqual(JSON.parse(res.raw), { detail: "failed to deliver" });
    }
  );
});

// D. Real-TCP E2E (rung 2): boot server.js as a real child process and hit it
// over real TCP. This exercises the real transporter-creation path (server.js
// 17-21) and the direct-run entrypoint (server.js 134-137) for real, but these
// run in a SEPARATE process so they are NOT credited in this run's coverage
// report (which only instruments the in-process test). Uses ONLY dummy SMTP
// creds — connection-free at import; we never assert a real mail delivery.
test("E2E: spawned server.js serves /healthz over real TCP", { timeout: 8000 }, async () => {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const serverPath = path.join(dir, "server.js");

  async function bootAndProbe(port) {
    const child = spawn(
      process.execPath,
      [serverPath],
      {
        env: {
          ...process.env,
          PORT: String(port),
          SMTP_USER: "dummy",
          SMTP_PASS: "dummy",
          CONTACT_TO: "x@y.co",
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    try {
      const eaddrinuse = await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("server did not boot within 4000ms")),
          4000
        );
        let out = "";
        let err = "";
        child.stdout.on("data", (c) => {
          out += c;
          if (out.includes("listening")) {
            clearTimeout(timer);
            resolve(false);
          }
        });
        child.stderr.on("data", (c) => {
          err += c;
          if (/EADDRINUSE/.test(err)) {
            clearTimeout(timer);
            resolve(true);
          }
        });
        child.on("exit", (code) => {
          clearTimeout(timer);
          if (/EADDRINUSE/.test(err)) resolve(true);
          else reject(new Error(`child exited early (code ${code}): ${err}`));
        });
      });
      if (eaddrinuse) return "retry";

      const res = await fetch(`http://127.0.0.1:${port}/healthz`);
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { status: "ok" });

      // Valid POST with dummy creds must fail to deliver (>=500), never 2xx —
      // the dummy transporter cannot actually connect/send.
      const post = await fetch(`http://127.0.0.1:${port}/contact`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: validBody(),
      });
      assert.ok(
        post.status >= 500,
        `dummy-cred POST should fail >=500, got ${post.status}`
      );
      return "ok";
    } finally {
      child.kill();
    }
  }

  let result = await bootAndProbe(18077);
  if (result === "retry") result = await bootAndProbe(18078);
  assert.equal(result, "ok");
});
