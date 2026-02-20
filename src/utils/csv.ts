import { parse } from 'csv-parse/sync';

export function parseCsv<T = Record<string, string>>(buffer: Buffer): T[] {
  return parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as T[];
}
