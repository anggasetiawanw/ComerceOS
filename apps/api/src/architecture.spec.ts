import { readdirSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';

const FORBIDDEN_IMPORTS = [
  '@nestjs/',
  '@prisma/client',
  'bullmq',
  'axios',
  '@supabase/supabase-js',
];

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

// Sprint 6: stores.holding_balance / available_balance / invoice_counter are
// ledger/invoicing-owned columns on a Store-owned row (.docs/03-bounded-contexts.md
// §3.6 — "Balances live on the store row but are mutated only by Ledger").
// TypeScript cannot express "this field is private to one other module's
// repository", so this is the enforced version of that rule: scanning only
// infrastructure/persistence/ (the layer that actually talks to Prisma) for
// these field names as object-literal keys, and failing if any file other
// than the three below contains one.
const LEDGER_OWNED_STORE_COLUMNS = ['holdingBalance', 'availableBalance', 'invoiceCounter'];

const BALANCE_COLUMN_WRITE_ALLOWLIST = [
  path.join('modules', 'store', 'infrastructure', 'persistence', 'store.mapper.ts'),
  path.join('modules', 'ledger', 'infrastructure', 'persistence', 'store-balance.prisma.repository.ts'),
  path.join('modules', 'invoicing', 'infrastructure', 'persistence', 'invoice-number.prisma.allocator.ts'),
];

const findInfrastructureFiles = (): string[] => {
  const modulesRoot = path.join(__dirname, 'modules');
  return readdirSync(modulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((moduleDir) => walk(path.join(modulesRoot, moduleDir.name, 'infrastructure')));
};

describe('architecture: stores.holding_balance / available_balance / invoice_counter fence', () => {
  const infrastructureFiles = findInfrastructureFiles();

  it('found at least one infrastructure file to check', () => {
    expect(infrastructureFiles.length).toBeGreaterThan(0);
  });

  it.each(infrastructureFiles)('%s only references ledger-owned store columns if allowlisted', (file) => {
    const content = readFileSync(file, 'utf8');
    const referencesLedgerColumn = LEDGER_OWNED_STORE_COLUMNS.some((column) =>
      content.includes(`${column}:`),
    );
    if (!referencesLedgerColumn) return;

    const isAllowlisted = BALANCE_COLUMN_WRITE_ALLOWLIST.some((allowed) => file.endsWith(allowed));
    expect(isAllowlisted).toBe(true);
  });
});

// "BalanceTransaction.create is private to StoreBalance" (.docs/04-entity-design.md
// §6) is not expressible in TypeScript, since domain/infrastructure files
// are siblings, not nested classes. This is the grep-based version: only
// the aggregate (which constructs one per mutation) and its mapper (which
// reconstitutes one per persisted row) may call the factory.
const BALANCE_TRANSACTION_RECORD_ALLOWLIST = [
  path.join('modules', 'ledger', 'domain', 'entities', 'store-balance.aggregate.ts'),
  path.join('modules', 'ledger', 'infrastructure', 'persistence', 'balance-transaction.mapper.ts'),
];

const findAllModuleFiles = (): string[] => {
  const modulesRoot = path.join(__dirname, 'modules');
  return readdirSync(modulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((moduleDir) => walk(path.join(modulesRoot, moduleDir.name)));
};

describe('architecture: BalanceTransaction.record() is private to StoreBalance', () => {
  const moduleFiles = findAllModuleFiles();

  it.each(moduleFiles)('%s only calls BalanceTransaction.record() if allowlisted', (file) => {
    if (file.endsWith(path.join('domain', 'entities', 'balance-transaction.entity.ts'))) return;
    const content = readFileSync(file, 'utf8');
    if (!content.includes('BalanceTransaction.record(')) return;

    const isAllowlisted = BALANCE_TRANSACTION_RECORD_ALLOWLIST.some((allowed) => file.endsWith(allowed));
    expect(isAllowlisted).toBe(true);
  });
});
