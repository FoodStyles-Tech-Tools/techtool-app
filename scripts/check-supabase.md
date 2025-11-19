# Troubleshooting Supabase Connection

## Step 1: Verify Your Supabase Project Status

1. Go to [app.supabase.com](https://app.supabase.com)
2. Check if your project shows as "Paused" - if so, click "Restore" to unpause it
3. Supabase free tier projects pause after 7 days of inactivity

## Step 2: Get the Correct Connection String

1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon) → **Database**
3. Scroll to **Connection string** section
4. You'll see multiple options:

### Option A: Direct Connection (Port 5432)
- Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`
- OR: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### Option B: Connection Pooling (Port 6543) - RECOMMENDED
- Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
- This uses a different hostname pattern (pooler.supabase.com instead of db.supabase.co)

## Step 3: Try Connection Pooling URL

The Connection Pooling URL often works better and uses a different hostname. Try this:

1. In Supabase Dashboard → Settings → Database
2. Find **Connection pooling** section
3. Select **Session mode** or **Transaction mode**
4. Copy the **URI** format
5. Replace `[YOUR-PASSWORD]` with your actual password (URL-encode if needed)
6. Update your `.env.local` file

## Step 4: Verify Hostname

The hostname in your connection string should match one of these patterns:
- `db.[PROJECT-REF].supabase.co` (Direct connection)
- `aws-0-[REGION].pooler.supabase.com` (Connection pooling)

If your hostname doesn't match, you might have copied the wrong connection string.

## Step 5: Test Network Connectivity

Try pinging the hostname from your terminal:
```bash
ping db.tsnkwdmbhyxadestkcva.supabase.co
```

If this fails, it's a network/DNS issue on your machine.

## Step 6: Check Firewall/Proxy

- If you're behind a corporate firewall, it might be blocking Supabase
- Try from a different network (mobile hotspot, etc.)
- Check if your VPN is interfering


