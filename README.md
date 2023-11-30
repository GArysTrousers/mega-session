# Redis Session Manager

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
    version: "1",
    timeoutMillis: 1000 * 60 * 60 * 24 * 3; // 3 days in millis
})

export const handle: Handle = async ({ event, resolve }) => {
    // get sessionId cookie
    const [sessionId, session] = sm.startSession(cookies['session_id']);
    event.locals.sessionId = sessionId;
    event.locals.session = session.data;

    let response = await resolve(event);

    if (event.locals.sessionId) { // see below
        session.data = event.locals.session
        await sm.saveSession(sessionId, session)
        // set sessionId cookie
    } else {
        await sm.removeSession(sessionId)
        // set sessionId cookie to expired
    }

    return response;
}

// To log user out in a route:
event.locals.sessionId = null
```

## Session Cleanup
You can run a periodic cleanup by running:
```
await sm.removeOldSessions()
```
