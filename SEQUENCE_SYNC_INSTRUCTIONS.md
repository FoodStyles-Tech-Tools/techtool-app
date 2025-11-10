# Ticket Sequence Sync - Fix for Duplicate Key Errors

## Problem
Sometimes when creating tickets, you encounter this error:
```
code: "23505"
details: "Key (id)=(1286) already exists."
message: "duplicate key value violates unique constraint "ticket_pkey""
```

This happens when the PostgreSQL sequence for the `ticket.id` column gets out of sync with the actual data in the table. This typically occurs when:
- Data is manually imported with explicit IDs
- The sequence doesn't get updated when data is inserted with explicit IDs
- The sequence falls behind the actual max ID in the table

## Solution

We've implemented a comprehensive solution that automatically syncs the sequence before every ticket insert operation.

### 1. Database Function (Recommended)

Run the SQL migration file in your Supabase SQL Editor:

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `supabase_migration_sync_ticket_sequence.sql`
4. Run the migration

This creates:
- A `sync_ticket_sequence()` function that can be called to sync the sequence
- An automatic trigger that syncs the sequence after each insert (additional safety net)

### 2. Client-Side Automatic Sync

The code has been updated to automatically:
- Sync the sequence before every ticket insert
- Retry with sequence sync if a duplicate key error occurs
- Handle errors gracefully

All ticket insert operations now use the `insertTicketsWithSequenceSync()` function which:
1. Removes any manual IDs from ticket data
2. Syncs the sequence before inserting
3. Retries with sequence sync if a duplicate key error is detected

## How It Works

1. **Before Insert**: The code checks the max ID in the ticket table and syncs the sequence if needed
2. **On Error**: If a duplicate key error (23505) occurs, the code automatically syncs the sequence and retries
3. **Database Trigger**: The database trigger ensures the sequence is always at least as high as any inserted ID

## Benefits

- ✅ **Automatic**: No manual intervention needed
- ✅ **Resilient**: Handles errors and retries automatically
- ✅ **Team-Friendly**: Works for all team members without manual steps
- ✅ **Future-Proof**: Database trigger provides additional safety net

## Manual Fix (If Needed)

If you still encounter issues, you can manually sync the sequence by running this in Supabase SQL Editor:

```sql
SELECT sync_ticket_sequence();
```

Or directly:

```sql
SELECT setval('ticket_id_seq', GREATEST((SELECT MAX(id) FROM ticket), 1), true);
```

## Testing

After implementing the solution:
1. Create a few tickets normally - they should work without errors
2. If you have existing tickets with high IDs, the sequence will automatically sync
3. The system will handle concurrent inserts gracefully

## Notes

- The solution works even if the database function doesn't exist (falls back to client-side sync)
- The database trigger provides an additional safety net but isn't required
- All existing ticket creation flows have been updated to use the new sync function

