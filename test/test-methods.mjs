import test from "node:test";
import assert from "node:assert/strict";
import { SessionManager } from "../dist/session-manager.js";

test("Session Manager", async () => {
  let sm = new SessionManager('redis://localhost:6379', 0, "1")
  let createdSessions = []
  await test("connect to redis", async () => {
    await sm.connect()
  })
  await test("create and save session", async () => {
    const [id, sesh] = sm.newSession({ name: "Bert" })
    createdSessions.push(id)
    assert.ok(id)
    assert.deepEqual(sesh.data, { name: "Bert" })
    assert.ok(await sm.saveSession(id, sesh));
  })
  await test("create, save and get session", async () => {
    const [id, sesh] = sm.newSession({ name: "Bert" })
    createdSessions.push(id)
    await sm.saveSession(id, sesh)
    const fetchedSesh = await sm.getSession(id)
    assert.deepEqual(sesh, fetchedSesh)
  })
  await test("remove sessions", async () => {
    for(let id of createdSessions) {
      assert.ok(await sm.removeSession(id))
    }
  })
  await sm.disconnect();
})