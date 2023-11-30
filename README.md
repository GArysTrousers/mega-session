# Mega Session

A redis session manager (mainly designed for sveltekit)

## SvelteKit Example
In your hooks.server.ts handle:
```
let sm = new SessionManager({
    redis: {
        url: "redis://localhost:6379",
        user: "",
        password: "",
        db: 0
    },
    cookieName: "session_id",
    version: "1",
    timeoutMillis: 1000 * 60 * 60 * 24 * 3, // 3 days in millis
})

export const handle: Handle = async ({ event, resolve }) => {
    const [sessionId, session] = sm.startSession(event.cookies.get(sm.options.cookieName));
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
