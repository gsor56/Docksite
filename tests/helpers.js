import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { request } from 'node:http';

export async function prepareEnvironment() {
  const directory = await mkdtemp(join(tmpdir(), 'docksite-test-'));
  async function port() {
    const server = createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const value = server.address().port;
    await new Promise((resolve) => server.close(resolve));
    return value;
  }
  Object.assign(process.env, {
    NODE_ENV: 'test',
    REVIEW_EMAIL: 'review@localhost.test',
    CONTACT_EMAIL: '',
    REPOSITORY_URL: '',
    SMTP_HOST: '',
    SMTP_USER: '',
    SMTP_PASSWORD: '',
    SMTP_FROM: 'sender@localhost.test',
    BASE_DOMAIN: 'localhost',
    URL_SCHEME: 'http',
    URL_MODE: 'path',
    DATABASE_PATH: join(directory, 'database.sqlite'),
    UPLOAD_DIR: join(directory, 'uploads'),
    SESSION_SECRET: 'public-test-secret-with-at-least-32-characters',
    CMS_SESSION_SECRET: 'cms-test-secret-with-at-least-32-characters',
    ANALYTICS_HASH_SECRET: 'analytics-test-secret-with-at-least-32-characters',
    SETUP_TOKEN: 'setup-test-token-with-at-least-32-characters',
    PORT: String(await port()),
    CMS_PORT: String(await port()),
    LINK_PORT: String(await port()),
    UPLOAD_MAX_BYTES: '1024',
  });
  return { directory, cleanup: () => rm(directory, { recursive: true, force: true }) };
}
export class Client {
  constructor(base, cookies = new Map()) {
    this.base = base;
    this.cookies = cookies;
  }
  async request(path, options = {}) {
    const headers = new Headers(options.headers);
    if (this.cookies.size)
      headers.set(
        'cookie',
        [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; '),
      );
    const response = await fetch(this.base + path, { ...options, headers, redirect: 'manual' });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0];
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      const value = pair.slice(index + 1);
      if (value) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }
    return response;
  }
  async token(path = '/login') {
    const response = await this.request(path);
    const html = await response.text();
    const token = html.match(/name="_csrf" value="([^"]+)"/)?.[1];
    if (!token)
      throw new Error(`No CSRF token at ${path}: ${response.status} ${html.slice(0, 400)}`);
    return token;
  }
  async post(path, values, tokenPath = '/login') {
    const token = await this.token(tokenPath);
    const body = new URLSearchParams({ _csrf: token });
    for (const [key, value] of Object.entries(values))
      for (const entry of Array.isArray(value) ? value : [value]) body.append(key, entry);
    return this.request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: this.base },
      body,
    });
  }
}
export function hostRequest(base, host) {
  return new Promise((resolve, reject) => {
    const req = request(base, { headers: { host } }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () =>
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }),
      );
    });
    req.on('error', reject);
    req.end();
  });
}
