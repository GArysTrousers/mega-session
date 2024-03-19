import { createClient, type RedisClientType } from "redis";
import { Provider } from ".";

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