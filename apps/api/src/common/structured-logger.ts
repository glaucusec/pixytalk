import type { LoggerService } from '@nestjs/common';

export class StructuredLogger implements LoggerService {
  log(message: unknown, context?: string) {
    this.write('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string) {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string) {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string) {
    this.write('trace', message, context);
  }

  fatal(message: unknown, context?: string) {
    this.write('fatal', message, context);
  }

  private write(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
  ) {
    const record = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? 'Application',
      message: this.toMessage(message),
      ...(trace ? { trace } : {}),
    };
    const output = JSON.stringify(record);
    if (level === 'error' || level === 'fatal')
      process.stderr.write(`${output}\n`);
    else process.stdout.write(`${output}\n`);
  }

  private toMessage(message: unknown): string {
    if (message instanceof Error) return message.message;
    if (typeof message === 'string') return message;
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
