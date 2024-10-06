import test from "node:test";
import assert from "node:assert/strict";
import { SessionManager } from "../dist/index.js";
import { InternalProvider } from "../dist/internal-provider.js";

await test("Session Manager - Internal", async () => {
  let sm = new SessionManager(
    new InternalProvider(), {
    cookieName: "session_id",
    version: "1",
    timeoutMillis: 1000000,
  })
  let createdSessions = []
  await test("init internal", async () => {
    await sm.init()
  })
  await test("create, save and get session", async () => {
    const session = sm.newSession({ name: "Bert" })    
    createdSessions.push(session.id)
    await sm.saveSession(session)
    const fetchedSession = await sm.getSession(session.id)
    assert.deepEqual(session, fetchedSession)
  })
  await test("get session that doesn't exist", async () => {
    const fetchedSesh = await sm.getSession("12345")
    assert.equal(null, fetchedSesh)
  })
  await test("remove sessions", async () => {
    for (let id of createdSessions) {
      assert.ok(await sm.removeSession(id))
      assert.equal(null, await sm.getSession(id))
    }
  })
  await sm.deinit();
})