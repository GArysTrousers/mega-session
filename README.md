# Session Manager

A session manager designed for sveltekit

## SvelteKit Example
In your hooks.server.ts handle:
```
const timeout = 1000 * 60 * 60 * 24 * 3; // 3 days in millis
const sm = new SessionManager('redis://localhost:6379', 0, "1", timout)

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

