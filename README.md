# Mega Session

A session manager (mainly designed for sveltekit)

Use the built in Redis data provider or create your own for another backend, just implement the Provider interface.

## SvelteKit Example
In your hooks.server.ts:
```
let sm = new SessionManager(
  new InternalProvider(), {
  cookieName: "session_id",
  version: "1",
  timeoutMillis: 1000000,
  jwtSecret: "shhhh!",
})
await sm.init()

export const handle: Handle = async ({ event, resolve }) => {
  const [sessionId, session] = await sm.startSession(event.cookies.get(sm.options.cookieName));
  event.locals.sessionId = sessionId;
  event.locals.session = session.data;

  let response = await resolve(event);

  if (event.locals.sessionId) { // see below
      session.data = event.locals.session
      await sm.saveSession(sessionId, session)
      response.headers.set('set-cookie', sm.freshCookie(sessionId))
  } else {
      await sm.removeSession(sessionId)
      response.headers.set('set-cookie', sm.expiredCookie())
  }

  return response;
}

// To logout a user in a route:
event.locals.sessionId = null
```

## Session Cleanup
You can run a periodic cleanup by running:
```
await sm.removeOldSessions()
```
