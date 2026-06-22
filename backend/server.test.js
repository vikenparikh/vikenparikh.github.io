import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
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
