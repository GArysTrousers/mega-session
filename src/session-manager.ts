import { createClient, type RedisClientType } from "redis";
import { v4 as uuid } from "uuid";

export interface Session {
  v: string;
  lastUsed: number;
  data: any;
}

export interface Options {
  redis: {
    url:string;
    user: string;
    password: string;
    db: string | number;
  }
  version: string;
  timeoutMillis: number;
}

export class SessionManager {

  redis: RedisClientType;
  options: Options;

  constructor(options:Options) {
    this.options = options
    this.redis = createClient({ 
      url: options.redis.url,
      database: Number(options.redis.db)
    });
    this.redis.on('error', (err) => console.log(err));
  }

  async connect() {
    await this.redis.connect();
  }

  async disconnect() {
    await this.redis.disconnect()
  }

  async startSession(id:string): Promise<[string, Session]> {
    let session = await this.getSession(id)

    if (session == null) return this.newSession()
    if (session.lastUsed < Date.now() - this.options.timeoutMillis) {
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
    let sessions = keys.map((v, i) => {
      return { id: v, data: sessionData[i] }
    })
    return sessions
  }

  async removeSession(id: string) {
    return await this.redis.del([id]) > 0
  }

  async removeSessionsOlderThan(millis: number) {
    const sessions = await this.getAllSessions();
    let clearedCount = 0
    for (let s of sessions) {
      try {
        let data = JSON.parse(s.data!) as Session
        if (!Object.hasOwn(data, 'user')) {
          clearedCount++;
          this.removeSession(s.id);
          continue;
        }
        if (data.v !== this.options.version) {
          clearedCount++;
          this.removeSession(s.id);
          continue;
        }
        if (data.lastUsed < Date.now() - millis) {
          clearedCount++;
          this.removeSession(s.id);
          continue;
        }
      } catch (error) {
        console.log(error);
      }
    }
    console.log(`Cleared ${clearedCount} sessions`)
  }
}