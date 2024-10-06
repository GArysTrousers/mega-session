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
  // get or create session
  event.locals.session = await sm.startSession(event.cookies.get(sm.options.cookieName));

  let response = await resolve(event);

  // save session
  response.headers.set('set-cookie', await sm.saveSession(event.locals.session))

  return response;
}

// To logout a user in a route:
event.locals.session.logout = true
```

## Session Cleanup
You can run a periodic cleanup by running:
```
await sm.removeOldSessions()
```
