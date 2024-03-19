import { Provider } from "./session-manager";

export class InternalProvider implements Provider {

  data: Map<string, string>;

  constructor() {
    this.data = new Map<string, string>();
  }

  async init() {

  }

  async deinit() {

  }

  async get(id: string) {
    return this.data.get(id);
  }

  async set(id: string, data: string) {
    this.data.set(id, data)
    return true;
  }

  async getCount() {
    return this.data.size;
  }

  async getAll() {
    const data = [];
    this.data.forEach((v, k) => {
      data.push({ id: k, session: v });
    })
    return data;
  }

  async remove(id: string) {
    return this.data.delete(id);
  }
}