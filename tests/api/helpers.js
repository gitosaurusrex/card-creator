// Minimal stand-ins for Vercel's req/res objects used by the API handlers.

export function createRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
    end() { return this; },
    json() { return typeof this.body === 'string' ? JSON.parse(this.body) : this.body; },
  };
  return res;
}

export function createReq({ method = 'GET', url = '/', headers = {}, body, query = {} } = {}) {
  return { method, url, headers: { host: 'test.local', ...headers }, body, query };
}

export const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
