import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';

/**
 * Local mirror of downloaded URLs. Files live at `<cacheDir>/<host>/<path>`.
 */
export class WebCache {
  private readonly cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
  }

  /** Cached copy of `url`, fetched with `init` on a miss; `undefined` on 404. */
  async get(url: string, init?: RequestInit) {
    const filepath = this.path(new URL(url));

    try {
      const file = await fs.open(filepath);
      return file.createReadStream();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    const body = await this.fetch(url, init);
    if (!body) {
      return undefined;
    }
    await this.populate(url, body);

    return createReadStream(filepath);
  }

  /** Stores `body` as the cached copy of `url`, replacing any existing one. */
  async populate(url: string, body: Readable | Uint8Array) {
    const filepath = this.path(new URL(url));

    await fs.mkdir(path.dirname(filepath), { recursive: true });
    const tmp = await this.persist(
      body instanceof Uint8Array ? Readable.from([body]) : body,
    );
    await fs.rename(tmp, filepath);
  }

  private path({ host, pathname, search }: URL) {
    let name = path.posix.join(host.replace(':', '_'), pathname);
    if (name.endsWith('/')) {
      name += 'index';
    }
    if (search) {
      name +=
        '.' + createHash('sha256').update(search).digest('hex').slice(0, 8);
    }

    return path.join(this.cacheDir, name);
  }

  private async fetch(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok || !response.body) {
      throw new Error(`${url}: HTTP ${response.status}`);
    }

    return Readable.fromWeb(response.body as ReadableStream);
  }

  private async persist(body: Readable) {
    const tmp = path.resolve(this.cacheDir, `${crypto.randomUUID()}.tmp`);
    try {
      await pipeline(body, createWriteStream(tmp));
    } catch (error) {
      await fs.rm(tmp, { force: true });
      throw error;
    }

    return tmp;
  }
}
