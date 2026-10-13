import assert from "node:assert/strict";
import test from "node:test";
import { verifyContentAdmin } from "../src/lib/admin-authorization.ts";

const failureStatus = (result: Awaited<ReturnType<typeof verifyContentAdmin>>) => "status" in result ? result.status : undefined;
const request = (header = "Bearer verified-token") => new Request("https://content.test", { headers: { authorization: header } });
const client = (user: Record<string, unknown> | null, error: unknown = null) => ({ auth: { getUser: async () => ({ data: { user: user as { id: string } | null }, error }) } });

test("requires a bearer token, verified identity, and server-owned content role", async () => {
  for (const header of ["", "token", "Basic verified-token", "Bearer ", "Bearer a b"]) {
    assert.equal(failureStatus(await verifyContentAdmin(request(header), client({ id: "u" }))), 401);
  }
  assert.equal(failureStatus(await verifyContentAdmin(request(), client(null))), 401);
  assert.equal(failureStatus(await verifyContentAdmin(request(), client({ id: "u", app_metadata: { content_admin: true } }, new Error("invalid")))), 401);
  for (const user of [
    { id: "u" }, { id: "u", user_metadata: { content_admin: true } },
    { id: "u", app_metadata: { role: "admin" } },
    { id: "u", app_metadata: { content_admin: "true" } },
    { id: "u", is_anonymous: true, app_metadata: { content_admin: true } },
  ]) assert.equal(failureStatus(await verifyContentAdmin(request(), client(user))), 403);
  assert.deepEqual(await verifyContentAdmin(request(), client({ id: "admin", app_metadata: { content_admin: true } })), { userId: "admin" });
});

test("role revocation is rechecked on every request", async () => {
  let user = { id: "admin", app_metadata: { content_admin: true } };
  const auth = { auth: { getUser: async () => ({ data: { user }, error: null }) } };
  assert.deepEqual(await verifyContentAdmin(request(), auth), { userId: "admin" });
  user = { ...user, app_metadata: { content_admin: false } };
  assert.equal(failureStatus(await verifyContentAdmin(request(), auth)), 403);
});

test("configuration and Auth outages fail closed", async () => {
  assert.equal(failureStatus(await verifyContentAdmin(request(), null)), 503);
  assert.equal(failureStatus(await verifyContentAdmin(request(), { auth: { getUser: async () => { throw new Error("offline"); } } })), 503);
});
