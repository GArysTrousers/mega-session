import { createClient, type RedisClientType } from "redis";
import { v4 as uuid } from "uuid";
import * as cookie from "cookie";
import * as jwt from "jsonwebtoken";

export interface Session {
  v: string;
  lastUsed: number;
  data: any;
}

interface Provider {
  init: () => Promise<void>
  deinit: () => Promise<void>
  get: (id: string) => Promise<string | null>
  set: (id: string, data: string) => Promise<boolean>
  getCount: () => Promise<number>
  getAll: () => Promise<{ id: string; session: string }[]>
  remove: (id: string) => Promise<boolean>
}

type RedisOptions = {
  host: string;
  port: string;
  db: string;
  user: string;
  password: string;
}

export class RedisProvider implements Provider {

  redis: RedisClientType;
  options: RedisOptions;

  constructor(options: RedisOptions) {
    this.options = options;
  }

  async init() {
    this.redis = createClient({
      url: `redis://${this.options.host}:${this.options.port}`,
      database: Number(this.options.db)
    });
    this.redis.on('error', (err) => console.log(err));
    await this.redis.connect()
  }

  async deinit() {
    await this.redis.disconnect()
  }

  async get(id: string) {
    return await this.redis.get(id);
  }

  async set(id: string, data: string) {
    return await this.redis.set(id, data) === "OK";
  }

  async getCount() {
    return await this.redis.dbSize();
  }

  async getAll() {
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
        session: sessionData[i]
      }
    })
    return sessions
  }

  async remove(id: string) {
    return await this.redis.del([id]) > 0
  }
}

export interface Options {
  cookieName: string;
  version: string;
  timeoutMillis: number;
  jwtSecret?: string;
}

export class SessionManager {

  options: Options;
  provider: Provider;
  maxCookieAge: number;

  constructor(provider: Provider, options: Options) {
    this.options = options
    this.provider = provider;
    this.maxCookieAge = Math.round(options.timeoutMillis / 1000)
  }

  async init() {
    await this.provider.init();
  }

  async deinit() {
    await this.provider.deinit();
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
      let data = await this.provider.get(id)
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
    return await this.provider.set(id, JSON.stringify(session))
  }

  async getSessionCount() {
    return await this.provider.getCount()
  }

  async getAllSessions() {
    return (await this.provider.getAll()).map((v) => ({
      id: v.id,
      session: JSON.parse(v.session)
    }))
  }

  async removeSession(id: string) {
    return await this.provider.remove(id)
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