# 🚀 Quick Start: Performance Optimization

## What Was Done

Your API endpoints were taking **5-7 seconds** to respond. They should now respond in **<300ms** (95%+ improvement).

## Files Changed

1. ✅ **Database Migration:** `supabase/migrations/042_performance_indexes.sql`
2. ✅ **Auth Helpers:** `lib/auth-helpers.ts` (optimized permission checks)
3. ✅ **Query Timing:** `lib/query-timing.ts` (new utility for monitoring)
4. ✅ **API Routes:** Optimized 4 endpoints:
   - `app/api/sprints/route.ts`
   - `app/api/epics/route.ts`
   - `app/api/tickets/route.ts`
   - `app/api/tickets/[id]/comments/route.ts`

## Next Steps

### 1. Apply Database Migration

```bash
# If using Supabase CLI
supabase db push

# Or manually run the migration
psql -h your-db-host -U postgres -d your-db-name -f supabase/migrations/042_performance_indexes.sql
```

### 2. Test the Endpoints

```bash
# Test sprints endpoint
curl http://localhost:3000/api/sprints?project_id=YOUR_PROJECT_ID

# Test epics endpoint
curl http://localhost:3000/api/epics?project_id=YOUR_PROJECT_ID

# Test tickets endpoint
curl http://localhost:3000/api/tickets?project_id=YOUR_PROJECT_ID

# Test comments endpoint
curl http://localhost:3000/api/tickets/TICKET_ID/comments
```

### 3. Monitor Performance

Check your server logs for query timing:
- `[SLOW QUERY]` - Queries taking >100ms
- `[TIMED]` - All timed queries

## Expected Results

| Endpoint | Before | After |
|----------|--------|-------|
| `/api/sprints` | ~6s | <300ms |
| `/api/epics` | ~6.5s | <300ms |
| `/api/tickets` | ~5s | <300ms |
| `/api/tickets/:id/comments` | ~7s | <300ms |

## Troubleshooting

### Still Slow?

1. **Check if indexes were created:**
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'tickets';
   ```

2. **Check query logs:**
   Look for `[SLOW QUERY]` messages in your server logs

3. **Verify index usage:**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM tickets WHERE project_id = '...' ORDER BY created_at DESC;
   ```
   Should show `Index Scan using idx_tickets_project_created`

### Indexes Not Created?

Make sure you ran the migration:
```bash
supabase migration up
```

## What Changed Under the Hood

1. **Added 15+ composite indexes** for common query patterns
2. **Optimized permission checks** (3 queries → faster queries with indexes)
3. **Added query timing** to identify bottlenecks
4. **Reduced overfetching** (select specific columns instead of `*`)
5. **Parallelized queries** where safe (comments endpoint)

## Need Help?

See `PERFORMANCE_DIAGNOSIS.md` for detailed analysis and `PERFORMANCE_OPTIMIZATIONS.md` for full documentation.
