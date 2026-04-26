import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseMaxFileSizeKb, RotatingFileLogWriter, StreamLogWriter } from './log-writer';

describe('log writers', () => {
  let tempDirectory: string;

  beforeEach(() => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-hub-logger-'));
  });

  afterEach(() => {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  it('writes stream logs with newline suffixes', () => {
    const chunks: string[] = [];
    const writer = new StreamLogWriter({
      write: (chunk: string) => {
        chunks.push(chunk);
        return true;
      },
    });

    writer.write('line');

    expect(chunks).toEqual(['line\n']);
  });

  it('rotates file logs when max size is exceeded', () => {
    const filePath = path.join(tempDirectory, 'app.log');
    const writer = new RotatingFileLogWriter(filePath, 0.001);

    writer.write('first line');
    writer.write('second line');

    const files = fs.readdirSync(tempDirectory).sort();

    expect(files).toHaveLength(2);
    expect(files).toContain('app.log');
    expect(files.some((file) => /^app-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.log$/.test(file))).toBe(true);
    expect(fs.readFileSync(filePath, 'utf8')).toBe('second line\n');
  });

  it('parses max file size from env values with a default fallback', () => {
    expect(parseMaxFileSizeKb('64')).toBe(64);
    expect(parseMaxFileSizeKb('bad')).toBe(1024);
    expect(parseMaxFileSizeKb('-1')).toBe(1024);
  });
});
