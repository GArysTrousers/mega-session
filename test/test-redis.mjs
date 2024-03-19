import test from "node:test";
import assert from "node:assert/strict";
import { SessionManager } from "../dist/index.js";
import { RedisProvider } from "../dist/redis-provider.js";

await test("Session Manager - Redis", async () => {
  let sm = new SessionManager(
    new RedisProvider({
      host: 'localhost',
      port: '6379',
      db: '0',
      user: '',
      password: '',
    }), {
    cookieName: "session_id",
    version: "1",
    timeoutMillis: 1000000,
  })
  let createdSessions = []
  await test("connect to redis", async () => {
    await sm.init()
  })
  await test("create, save and get session", async () => {
    const [id, sesh] = sm.newSession({ name: "Bert" })
    createdSessions.push(id)
    await sm.saveSession(id, sesh)
    const fetchedSesh = await sm.getSession(id)
    assert.deepEqual(sesh, fetchedSesh)
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