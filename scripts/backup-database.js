// Creates a full PostgreSQL backup using pg_dump.
// Requires: PostgreSQL client tools (pg_dump) on PATH, or install via:
//   - Supabase CLI: npm i -g supabase (includes pg_dump)
//   - Or install PostgreSQL: https://www.postgresql.org/download/windows/
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_CONNECTION_STRING;

if (!connectionString) {
  console.error('❌ POSTGRES_CONNECTION_STRING is not set in .env or .env.local');
  process.exit(1);
}

let url;
try {
  url = new URL(connectionString);
} catch (e) {
  console.error('❌ Invalid POSTGRES_CONNECTION_STRING format');
  process.exit(1);
}

const backupsDir = path.join(__dirname, '..', 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupFile = path.join(backupsDir, `backup-${timestamp}.sql`);

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
  console.log('Created backups directory:', backupsDir);
}

console.log('Creating database backup...');
console.log('Output:', backupFile);

const pgEnv = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || '5432',
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: url.password ? decodeURIComponent(url.password) : '',
  PGDATABASE: url.pathname.slice(1) || 'postgres',
};

const child = spawn(
  'pg_dump',
  ['--no-owner', '--no-acl', '-f', backupFile],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: pgEnv,
    cwd: backupsDir,
  }
);

let stderr = '';
child.stderr.on('data', (data) => {
  stderr += data;
  process.stderr.write(data);
});
child.stdout.on('data', (data) => process.stdout.write(data));

child.on('close', (code) => {
  if (code === 0) {
    const stat = fs.statSync(backupFile);
    console.log('\n✅ Backup complete:', backupFile);
    console.log('   Size:', (stat.size / 1024).toFixed(1), 'KB');
  } else {
    console.error('\n❌ pg_dump failed with code', code);
    if (stderr.includes('not found') || stderr.includes('command not found')) {
      console.error('\n💡 pg_dump not found. Install PostgreSQL client tools:');
      console.error('   - Windows: https://www.postgresql.org/download/windows/');
      console.error('   - Or: npm i -g supabase (Supabase CLI includes pg_dump)');
      console.error('   Then ensure the bin directory is on your PATH.');
    }
    if (connectionString.includes('pooler.supabase.com') && (stderr.includes('timeout') || code !== 0)) {
      console.error('\n💡 For full dumps, use the direct DB URL from Supabase Dashboard:');
      console.error('   Settings → Database → Connection string (direct, not pooler).');
    }
    process.exit(code || 1);
  }
});
child.on('error', (err) => {
  console.error('❌ Failed to run pg_dump:', err.message);
  if (err.code === 'ENOENT') {
    console.error('\n💡 pg_dump not found on PATH. Install PostgreSQL client tools.');
  }
  process.exit(1);
});
