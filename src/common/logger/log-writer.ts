import * as fs from 'fs';
import * as path from 'path';

export interface LogWriter {
  write(line: string): void;
}

export class StreamLogWriter implements LogWriter {
  constructor(private readonly stream: Pick<NodeJS.WriteStream, 'write'> = process.stdout) {}

  write(line: string): void {
    this.stream.write(`${line}\n`);
  }
}

export const parseMaxFileSizeKb = (value = process.env.LOG_MAX_FILE_SIZE): number => {
  const parsedValue = Number.parseInt(value ?? '', 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1024;
};

const toRotationTimestamp = (date = new Date()): string =>
  date
    .toISOString()
    .replace(/\.\d{3}Z$/, '')
    .replace(/:/g, '-');

export class RotatingFileLogWriter implements LogWriter {
  private readonly maxFileSizeBytes: number;

  constructor(
    private readonly filePath = path.join(process.cwd(), 'logs', 'app.log'),
    maxFileSizeKb = parseMaxFileSizeKb(),
  ) {
    this.maxFileSizeBytes = maxFileSizeKb * 1024;
  }

  write(line: string): void {
    const lineWithNewline = `${line}\n`;
    this.ensureLogDirectory();
    this.rotateIfNeeded(Buffer.byteLength(lineWithNewline));
    fs.appendFileSync(this.filePath, lineWithNewline);
  }

  private ensureLogDirectory(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
  }

  private rotateIfNeeded(nextWriteSize: number): void {
    if (!fs.existsSync(this.filePath)) {
      return;
    }

    const currentSize = fs.statSync(this.filePath).size;

    if (currentSize === 0 || currentSize + nextWriteSize <= this.maxFileSizeBytes) {
      return;
    }

    fs.renameSync(this.filePath, this.createRotationPath());
  }

  private createRotationPath(): string {
    const directory = path.dirname(this.filePath);
    const extension = path.extname(this.filePath);
    const basename = path.basename(this.filePath, extension);
    const timestamp = toRotationTimestamp();
    let rotationPath = path.join(directory, `${basename}-${timestamp}${extension}`);
    let index = 1;

    while (fs.existsSync(rotationPath)) {
      rotationPath = path.join(directory, `${basename}-${timestamp}-${index}${extension}`);
      index += 1;
    }

    return rotationPath;
  }
}
