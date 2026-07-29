import { readdirSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';

const FORBIDDEN_IMPORTS = ['@nestjs/', '@prisma/client', 'bullmq', 'axios'];

const walk = (dir: string): string[] => {
  if (!statSync(dir, { throwIfNoEntry: false })) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [fullPath] : [];
  });
};

const findDomainFiles = (): string[] => {
  const modulesRoot = path.join(__dirname, 'modules');
  return readdirSync(modulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((moduleDir) => walk(path.join(modulesRoot, moduleDir.name, 'domain')));
};

describe('architecture: domain layer purity', () => {
  const domainFiles = findDomainFiles();

  it('found at least one domain file to check', () => {
    expect(domainFiles.length).toBeGreaterThan(0);
  });

  it.each(domainFiles)('%s has no framework/infrastructure imports', (file) => {
    const content = readFileSync(file, 'utf8');
    const importLines = content.split('\n').filter((line) => /^\s*import\s/.test(line));

    for (const forbidden of FORBIDDEN_IMPORTS) {
      const offending = importLines.filter((line) => line.includes(`'${forbidden}`));
      expect(offending).toEqual([]);
    }
  });
});
