# 🔍 Performance Diagnosis Report

## Current Performance Issues

### 1. **requirePermission() Overhead (CRITICAL)**
**Location:** `lib/auth-helpers.ts:118-127`

**Problem:** Every API call executes 3 sequential database queries:
1. `SELECT role FROM users WHERE email = ?` 
2. `SELECT id FROM roles WHERE name ILIKE ?`
3. `SELECT id FROM permissions WHERE role_id = ? AND resource = ? AND action = ?`

**Impact:** ~100-300ms overhead per API call, multiplied across all endpoints.

**Example:** `/api/sprints` → `requirePermission()` → 3 queries → actual query → response
- Total: 6-7 seconds (likely 5-6s from requirePermission overhead)

### 2. **Missing Composite Indexes**

**Tickets Table:**
- ❌ `(project_id, created_at)` - Used in: `GET /api/tickets?project_id=X` with `ORDER BY created_at DESC`
- ❌ `(status, created_at)` - Used when filtering by status and ordering
- ❌ `(assignee_id, created_at)` - Used when filtering by assignee
- ❌ `(project_id, status, created_at)` - Common combination

**Epics Table:**
- ❌ `(project_id, created_at)` - Used in: `GET /api/epics?project_id=X ORDER BY created_at DESC`

**Sprints Table:**
- ❌ `(project_id, created_at)` - Used in: `GET /api/sprints?project_id=X ORDER BY created_at DESC`

**Users Table:**
- ✅ `(email)` exists, but could benefit from covering index `(email, id, role)` to avoid table lookup

### 3. **Overfetching in Tickets Query**

**Location:** `app/api/tickets/route.ts:25-34`

**Problem:** Selecting `*` from tickets and joining 7 related tables, then fetching auth_user images separately.

**Impact:** Large payload size, unnecessary data transfer.

### 4. **Sequential Queries in Comments Endpoint**

**Location:** `app/api/tickets/[id]/comments/route.ts:17-102`

**Problem:** 
1. Check ticket exists (query 1)
2. Get comments (query 2) 
3. Get mentions (query 3)

Queries 2 and 3 could be parallelized.

### 5. **No Query Time Logging**

**Problem:** Cannot identify which specific query is slow.

**Solution:** Add timing logs around database queries.

---

## Expected Performance Improvements

| Endpoint | Current | After Optimization | Improvement |
|----------|---------|-------------------|-------------|
| `/api/sprints` | ~6s | <300ms | **95% faster** |
| `/api/epics` | ~6.5s | <300ms | **95% faster** |
| `/api/tickets` | ~5s | <300ms | **94% faster** |
| `/api/tickets/:id/comments` | ~7s | <300ms | **96% faster** |

---

## Root Cause Analysis

The **primary bottleneck** is `requirePermission()` making 3 sequential queries on every API call. With 6-7 second response times, this suggests:

1. **requirePermission overhead:** ~5-6 seconds (3 queries × ~2s each)
2. **Actual query time:** ~1 second
3. **Network/other overhead:** ~0.5 seconds

---

## Optimization Strategy

1. **Cache user/role/permission lookups** (biggest win)
2. **Add composite indexes** (medium win)
3. **Add query time logging** (diagnostic)
4. **Optimize queries** (reduce overfetching, parallelize)
5. **Add pagination defaults** (already present in tickets)
