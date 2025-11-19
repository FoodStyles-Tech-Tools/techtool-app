// Test script to verify database connection
const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_CONNECTION_STRING;

if (!connectionString) {
  console.error('❌ POSTGRES_CONNECTION_STRING is not set in .env.local');
  process.exit(1);
}

console.log('Testing connection string...');
console.log('Connection string (masked):', connectionString.replace(/:[^:@]+@/, ':****@'));

// Parse the connection string to check format
try {
  const url = new URL(connectionString);
  console.log('\n✅ Connection string format is valid');
  console.log('Hostname:', url.hostname);
  console.log('Port:', url.port || '5432 (default)');
  console.log('Database:', url.pathname.slice(1));
  console.log('Username:', url.username);
} catch (error) {
  console.error('❌ Invalid connection string format:', error.message);
  process.exit(1);
}

// Try to connect
console.log('\nAttempting to connect...');
const sql = postgres(connectionString, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

sql`SELECT version()`
  .then((result) => {
    console.log('✅ Connection successful!');
    console.log('PostgreSQL version:', result[0].version);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 DNS lookup failed. Possible issues:');
      console.error('1. Check if the hostname is correct');
      console.error('2. Verify your network can reach Supabase');
      console.error('3. Check if your Supabase project is paused');
      console.error('4. Try using the Connection Pooling URL (port 6543) instead');
    }
    process.exit(1);
  })
  .finally(() => {
    sql.end();
  });


