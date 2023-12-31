import test from "node:test";
import assert from "node:assert/strict";
import * as cookie from "cookie";
import { SessionManager } from "../dist/index.js";

await test("Session Manager", async () => {
  let sm = new SessionManager({
    redis: {
      host: "localhost",
      port: "6379",
      user: "",
      password: "",
      db: 0
    },
    cookieName: "session_id",
    version: "1",
    timeoutMillis: 1000000,
    jwtSecret: "shhhh!",
  })
  await sm.connect()
  let createdSessions = []

  await test("get session id cookie", async () => {
    let [idA, seshA] = sm.newSession();
    createdSessions.push(idA);
    await sm.saveSession(idA, seshA);
    let cookieString = sm.freshCookie({ id: idA });
    let cookies = cookie.parse(cookieString);

    let [idB, seshB] = await sm.startSession(cookies[sm.options.cookieName]);
    assert.equal(idA, idB)
  })
  await test("remove sessions", async () => {
    for (let id of createdSessions) {
      assert.ok(await sm.removeSession(id))
      assert.equal(null, await sm.getSession(id))
    }
  })
  await sm.disconnect();
})