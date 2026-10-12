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

  async get(url: string) {
    const filepath = this.path(new URL(url));

    try {
      const file = await fs.open(filepath);
      return file.createReadStream();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    const tmp = await this.fetch(url).then((body) => this.save(body));
    if (!tmp) {
      return undefined;
    }
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.rename(tmp, filepath);

    return createReadStream(filepath);
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

  private async fetch(url: string) {
    const response = await fetch(url);
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok || !response.body) {
      throw new Error(`${url}: HTTP ${response.status}`);
    }

    return Readable.fromWeb(response.body as ReadableStream);
  }

  private async save(body: Readable | undefined) {
    if (!body) {
      return undefined;
    }

    await fs.mkdir(this.cacheDir, { recursive: true });
    const tmp = path.join(this.cacheDir, `${crypto.randomUUID()}.tmp`);
    try {
      await pipeline(body, createWriteStream(tmp));
    } catch (error) {
      await fs.rm(tmp, { force: true });
      throw error;
    }

    return tmp;
  }
}
