import fs from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { text } from 'node:stream/consumers';

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { Downloads } from './downloads.ts';

describe('Downloads', () => {
  let server: http.Server;
  let origin: string;
  let host: string;
  let hits: Record<string, number>;
  let cacheDir: string;
  let downloads: Downloads;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const { pathname, search } = new URL(req.url!, 'http://x');
      hits[req.url!] = (hits[req.url!] ?? 0) + 1;

      switch (pathname) {
        case '/files/a.txt':
          return res.end('hello');
        case '/dir/':
          return res.end('index body');
        case '/query':
          return res.end(`query ${search}`);
        case '/slow':
          return void setTimeout(() => res.end('slow body'), 50);
        case '/boom':
          res.statusCode = 500;
          return res.end('boom');
        case '/cut':
          // The first response is cut short, the next one is complete.
          if (hits[req.url!] === 1) {
            res.setHeader('Content-Length', '10');
            res.write('part');
            return setTimeout(() => res.destroy(), 10);
          }
          return res.end('0123456789');
        default:
          res.statusCode = 404;
          return res.end('not found');
      }
    });

    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const { port } = server.address() as AddressInfo;
    origin = `http://127.0.0.1:${port}`;
    host = `127.0.0.1_${port}`;
  });

  afterAll(() => {
    server.closeAllConnections();
    server.close();
  });

  beforeEach(async () => {
    hits = {};
    cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'downloads-'));
    downloads = new Downloads(cacheDir);
  });

  afterEach(() => fs.rm(cacheDir, { recursive: true, force: true }));

  /** Cached files, relative to the cache directory. */
  const files = async () =>
    (await fs.readdir(cacheDir, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) =>
        path.relative(cacheDir, path.join(entry.parentPath, entry.name)),
      )
      .sort();

  it('should return the body of the URL', async () => {
    const stream = await downloads.get(`${origin}/files/a.txt`);

    expect(await text(stream!)).toBe('hello');
  });

  it('should mirror the URL as <host>/<path> in the cache directory', async () => {
    await text((await downloads.get(`${origin}/files/a.txt`))!);

    expect(await files()).toEqual([`${host}/files/a.txt`]);
  });

  it('should serve repeated requests from the cache', async () => {
    await text((await downloads.get(`${origin}/files/a.txt`))!);
    const again = await downloads.get(`${origin}/files/a.txt`);

    expect(await text(again!)).toBe('hello');
    expect(hits['/files/a.txt']).toBe(1);
  });

  it('should share the cache between instances over one directory', async () => {
    await text((await downloads.get(`${origin}/files/a.txt`))!);
    const other = new Downloads(cacheDir);

    expect(await text((await other.get(`${origin}/files/a.txt`))!)).toBe(
      'hello',
    );
    expect(hits['/files/a.txt']).toBe(1);
  });

  it('should keep different query strings apart', async () => {
    const one = await downloads.get(`${origin}/query?v=1`);
    const two = await downloads.get(`${origin}/query?v=2`);

    expect(await text(one!)).toBe('query ?v=1');
    expect(await text(two!)).toBe('query ?v=2');
    expect(await files()).toHaveLength(2);
  });

  it('should store a trailing-slash URL as an index file', async () => {
    await text((await downloads.get(`${origin}/dir/`))!);

    expect(await files()).toEqual([`${host}/dir/index`]);
  });

  it('should resolve to undefined on 404 and cache nothing', async () => {
    await expect(downloads.get(`${origin}/missing`)).resolves.toBeUndefined();
    await expect(downloads.get(`${origin}/missing`)).resolves.toBeUndefined();

    expect(hits['/missing']).toBe(2);
    expect(await files()).toEqual([]);
  });

  it('should reject on other HTTP errors and cache nothing', async () => {
    await expect(downloads.get(`${origin}/boom`)).rejects.toThrow('HTTP 500');

    expect(await files()).toEqual([]);
  });

  it('should leave no partial file behind when a download is cut', async () => {
    await expect(downloads.get(`${origin}/cut`)).rejects.toThrow();
    expect(await files()).toEqual([]);

    const retry = await downloads.get(`${origin}/cut`);
    expect(await text(retry!)).toBe('0123456789');
  });

  it('should hand every concurrent caller the complete file', async () => {
    const streams = await Promise.all(
      Array.from({ length: 5 }, () => downloads.get(`${origin}/slow`)),
    );
    const bodies = await Promise.all(streams.map((stream) => text(stream!)));

    expect(bodies).toEqual(Array(5).fill('slow body'));
    expect(await files()).toEqual([`${host}/slow`]);
  });
});
