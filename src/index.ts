import { createClient, type RedisClientType } from "redis";
import { v4 as uuid } from "uuid";
import * as cookie from "cookie";
import * as jwt from "jsonwebtoken";

export interface Session {
  v: string;
  lastUsed: number;
  data: any;
}

export interface Options {
  redis: {
    url: string;
    db: string | number;
    user: string;
    password: string;
  },
  cookieName: string;
  version: string;
  timeoutMillis: number;
  jwtSecret?: string;
}

export class SessionManager {

  redis: RedisClientType;
  options: Options;
  maxCookieAge: number;

  constructor(options: Options) {
    this.options = options
    this.redis = createClient({
      url: options.redis.url,
      database: Number(options.redis.db)
    });
    this.redis.on('error', (err) => console.log(err));
    this.maxCookieAge = Math.round(this.options.timeoutMillis / 1000)
  }

  async connect() {
    await this.redis.connect();
  }

  async disconnect() {
    await this.redis.disconnect()
  }

  async startSession(id: string | null | undefined): Promise<[string, Session]> {
    if (!id) return this.newSession()
    
    if (this.options.jwtSecret) {
      let token = jwt.verify(id, this.options.jwtSecret)
      if (typeof token === 'object' && Object.hasOwn(token, 'id')) {
        id = token.id
      } else {
        return this.newSession()
      }
    }

    let session = await this.getSession(id)

    if (session == null) return this.newSession()
    if (session.lastUsed < Date.now() - this.options.timeoutMillis || session.v != this.options.version) {
      await this.removeSession(id)
      return this.newSession()
    }

    session.lastUsed = Date.now()
    return [id, session]
  }

  async getSession(id: string): Promise<Session | null> {
    if (!id) return null;
    try {
      let data = await this.redis.get(id);
      return JSON.parse(data) as Session
    } catch (error) {
      return null
    }
  }

  newSession(data: any = {}): [string, Session] {
    let id = uuid();
    let session: Session = {
      v: this.options.version,
      lastUsed: Date.now(),
      data: data
    };
    return [id, session];
  }

  async saveSession(id: string, session: Session) {
    return await this.redis.set(id, JSON.stringify(session)) === "OK";
  }

  async getSessionCount() {
    return await this.redis.dbSize();
  }

  async getAllSessions() {
    let COUNT = 2000
    let maxKeys = 2000
    let curser = 0
    let res = await this.redis.scan(0, { COUNT })
    let keys = [...res.keys]
    while (res.cursor != 0 && keys.length <= maxKeys) {
      curser = res.cursor
      keys = [...keys, ...res.keys]
      res = await this.redis.scan(curser, { COUNT })
    }
    keys = keys.slice(0, maxKeys)
    let sessionData = await Promise.all(keys.map(async (v) => {
      return await this.redis.get(v)
    }))
    let sessions = keys.map((id, i) => {
      return {
        id: id,
        session: JSON.parse(sessionData[i]) as Session
      }
    })
    return sessions
  }

  async removeSession(id: string) {
    return await this.redis.del([id]) > 0
  }

  async removeOldSessions() {
    const sessions = await this.getAllSessions();
    let clearedCount = 0
    for (let s of sessions) {
      try {
        if (s.session.v !== this.options.version) {
          clearedCount++;
          this.removeSession(s.id);
        }
        else if (s.session.lastUsed < Date.now() - this.options.timeoutMillis) {
          clearedCount++;
          this.removeSession(s.id);
        }
      } catch (error) {
        console.log(error);
      }
    }
    console.log(`Cleared ${clearedCount} sessions`)
  }

  freshCookie(id: string) {
    return cookie.serialize(
      this.options.cookieName,
      this.options.jwtSecret
        ? jwt.sign(id, this.options.jwtSecret)
        : id,
      {
        httpOnly: true,
        maxAge: this.maxCookieAge,
        sameSite: 'strict',
        path: '/'
      })
  }

  expiredCookie() {
    return cookie.serialize(this.options.cookieName, '',
      {
        httpOnly: true,
        maxAge: 0,
        sameSite: 'strict',
        path: '/'
      })
  }
}