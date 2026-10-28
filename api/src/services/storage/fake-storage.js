// Storage trong bộ nhớ cho test: không gọi mạng, url có dạng memory://<key>.
export class FakeStorage {
  constructor() {
    this.files = new Map();
  }

  async upload({ key, buffer, contentType }) {
    this.files.set(key, { buffer, contentType });
    return { url: `memory://${key}` };
  }
}
