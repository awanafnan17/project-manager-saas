# 📝 Assessment Answers — ProjectMgr SaaS

> Detailed answers to all assessment sections, referencing our actual implementation.

---

## Section 1: System Design & Architecture

### 1.1 How would you design a multi-tenant SaaS application?

Our implementation uses the **shared database, shared schema** approach — the most cost-effective model for SaaS at scale. Every data table includes a `tenant_id` column (UUID foreign key to the `tenants` table), and every service-layer query filters by this ID. This is enforced in the service layer, not left to individual controllers.

The alternative approaches are: (a) **database-per-tenant**, which provides the strongest isolation but is expensive and hard to migrate, and (b) **schema-per-tenant**, which offers good isolation but complicates connection pooling. Our approach trades some isolation for operational simplicity — a single Prisma schema, single connection pool, single migration path.

To ensure no data leakage, every service method accepts `tenantId` as a required parameter extracted from the authenticated JWT. This means even if a developer forgets to filter, the `where` clause always includes `tenantId`. For defense-in-depth, PostgreSQL Row-Level Security policies could be added as a second layer (noted as a future improvement).

### 1.2 Explain your authentication and authorization strategy

We use a **dual-token JWT strategy**: a short-lived access token (15 minutes) for API authorization, and a long-lived refresh token (7 days) for session continuity. The access token is stored in memory/localStorage on the client and sent via the `Authorization: Bearer` header. The refresh token is stored as an HTTP-only, Secure, SameSite=Strict cookie — invisible to JavaScript and immune to XSS.

Refresh tokens are hashed (SHA-256) before storage in the `refresh_tokens` table. On each refresh, the old token is deleted and a new one issued — **token rotation** prevents replay attacks. If a stolen refresh token is used after the legitimate user has already rotated it, the token won't be found in the database.

Authorization is handled by the `requireRole()` middleware factory, which accepts allowed roles and checks `req.user.role` (populated by the `authenticateToken` middleware). This gives us declarative RBAC at the route level: `requireRole('admin', 'manager')`.

### 1.3 How do you handle error handling across the stack?

Our error handling follows a **centralized, layered approach**. The backend defines an `AppError` class that carries an HTTP status code and an `isOperational` flag. Service methods throw `AppError` instances (e.g., `new AppError('Project not found', 404)`), which bubble up through controllers (via `next(error)`) to the global `errorHandler` middleware.

The error handler differentiates three categories: (1) `ZodError` → 400 with field-level details, (2) `AppError` → status code from the error, (3) unhandled errors → 500 with stack trace in development, generic message in production. This ensures clients always get consistent JSON responses.

On the frontend, the Axios response interceptor catches 401s and attempts a token refresh. The Zustand stores catch all API errors and expose them as `error` state, which components render as inline alerts. Forms use react-hook-form's error state for field-level validation feedback.

### 1.4 Describe your approach to data modeling

Our Prisma schema models 13 tables organized around the core entities: Tenant → User → Project → Task. Key design decisions include:

**UUIDs over auto-increment:** All primary keys are UUIDs (`@default(uuid())`), preventing enumeration attacks and simplifying distributed systems. **Composite unique constraints:** `[tenantId, email]` on users allows the same email in different tenants. `[projectId, userId]` on project members prevents duplicate memberships. **Strategic indexing:** We index `tenantId` on every table, `[projectId, status]` for Kanban column queries, and `[recipientId, isRead]` for notification badge counts.

The schema supports features beyond the current MVP — subtasks (self-referential `parentId` on Task), threaded comments (`parentId` on Comment), file attachments, and labels — making it extensible without migrations.

### 1.5 How would you evolve this architecture for 10x scale?

At 10x scale (~10,000 concurrent users), the bottleneck shifts from application to database. The immediate steps would be: (1) **Connection pooling** — already in place via Supabase Supavisor, (2) **Read replicas** — route list/search queries to replicas, (3) **Redis caching** — cache project listings, user sessions, and rate limit counters.

At 100x, we'd move to: **Microservices** for notifications and file processing (decoupled via a message queue like RabbitMQ), **CDN** for static assets, and **Kubernetes** for container orchestration. The stateless API design makes horizontal scaling trivial — add more pods behind a load balancer.

For the database, we'd consider **partitioning by tenant_id** (range or hash partitioning), or migrating the most active tenants to dedicated databases. PostgreSQL's built-in partitioning supports this without application changes.

---

## Section 2: Backend Engineering

### 2.1 How do you structure an Express.js backend for maintainability?

We use a **modular, feature-based architecture** where each domain (auth, projects, tasks) has its own directory containing four files: `*.schemas.ts` (Zod validation), `*.service.ts` (business logic), `*.controller.ts` (HTTP handling), and `*.routes.ts` (route definitions).

This separation ensures: (a) Services are testable without HTTP context, (b) Controllers are thin — just extract params, call service, format response, (c) Routes are declarative — middleware composition is visible at a glance, (d) Schemas are reusable across frontend and backend.

Cross-cutting concerns (auth, RBAC, validation, error handling) live in the `middleware/` directory and are composed in the route files. This keeps the middleware chain explicit: `authenticateToken → requireRole → validateRequest → controller`.

### 2.2 Explain your validation strategy

Validation happens at two levels. On the backend, the `validateRequest` middleware parses `req.body` (for POST/PUT/PATCH) or `req.query` (for GET) through a Zod schema. The parsed, typed data is attached to `req.validatedData`, so controllers never touch raw user input.

On the frontend, react-hook-form with `@hookform/resolvers/zod` validates forms before submission, providing instant field-level feedback. The frontend and backend schemas are intentionally similar but not shared — the frontend schema can be more lenient (optional fields for partial updates) while the backend enforces strict types.

Zod's `.coerce` transformers handle type conversion (string query params to numbers/dates), and `.refine` validators handle cross-field rules (e.g., end date must be after start date).

### 2.3 How do you handle database transactions?

Prisma's `$transaction` API provides ACID guarantees for multi-step operations. In our codebase, `createProject` uses a transaction to atomically: (1) create the project record, (2) add the owner as a project member with the "manager" role. If either step fails, both are rolled back.

For operations where atomicity isn't critical (like activity logging), we use a fire-and-forget pattern — the `logActivity` function catches and logs errors without propagating them. This prevents audit logging failures from blocking user operations.

### 2.4 How do you handle pagination and filtering?

All list endpoints accept `page` and `limit` parameters (validated by Zod with defaults and max limits). The service calculates `skip = (page - 1) * limit` and returns both the data array and pagination metadata: `{ items, total, page, totalPages }`.

Filtering is additive — each filter parameter narrows the result set. For projects, we support text search (`name ILIKE` and `description ILIKE`) and status filtering. For tasks, we support status, assignee, priority, and text search. The `where` clause is built dynamically using spread syntax to only include provided filters.

### 2.5 Describe your logging and observability approach

We use Winston for structured logging with JSON format in production and colorized console output in development. Every significant operation logs: action, entity ID, user ID, and tenant ID. The activity logger writes to the `activity_logs` table for a persistent audit trail.

In production, these logs would be shipped to a centralized service (DataDog, CloudWatch, or ELK stack) for alerting and analysis. Key metrics to monitor: API response times (p50/p95/p99), error rates by endpoint, database query latency, and authentication failure rates.

---

## Section 3: API & Integration

### 3.1 How do you design RESTful APIs?

Our API follows REST conventions with consistent URL patterns: nouns for resources (`/projects`, `/tasks`), HTTP methods for actions (GET/POST/PUT/PATCH/DELETE), and nested routes for relationships (`/projects/:id/members`, `/projects/:projectId/tasks`).

All responses use a consistent envelope: `{ success: boolean, data?: T, message?: string }`. Error responses use `{ error: string, details?: [] }`. Status codes are semantic: 200 (OK), 201 (Created), 400 (Validation), 401 (Unauthenticated), 403 (Unauthorized), 404 (Not Found), 409 (Conflict).

We separate "quick update" endpoints (PATCH `/tasks/:id/status` for Kanban) from full updates (PUT `/tasks/:id`) to keep the frontend simple and reduce payload size.

### 3.2 How do you handle API versioning?

All routes are prefixed with `/api/v1/`. When breaking changes are needed, we'd create `/api/v2/` routes alongside v1, allowing clients to migrate at their own pace. The version is in the URL (not headers) for simplicity and discoverability.

### 3.3 How do you prevent API abuse?

We use `express-rate-limit` with a configurable window (15 min default) and max requests (100 default) on the `/api` prefix. Authentication endpoints could have stricter limits (e.g., 5 login attempts per minute) to prevent brute-force attacks.

Additional measures include: JWT expiry (15 min lifespan limits damage from stolen tokens), input validation (Zod prevents malformed payloads), and Helmet.js (adds security headers that prevent common web attacks).

### 3.4 How do you handle file uploads?

While not implemented in the current MVP, our schema includes an `attachments` table with `file_name`, `file_key`, `file_size`, and `mime_type` columns. The planned implementation uses presigned S3 URLs — the client requests an upload URL from the API, uploads directly to S3 (bypassing the API server), then confirms the upload with metadata.

This approach avoids loading the API server's memory with file buffers and supports files up to any size.

### 3.5 How would you implement real-time features?

Socket.IO is already initialized in our backend (`config/socket.ts`) with room-based architecture. Clients join tenant-specific rooms (`tenant:{tenantId}`) and project-specific rooms (`project:{projectId}`). When a task is updated, the service emits an event to the project room, and all connected clients receive the update.

The frontend would subscribe via `useEffect` in relevant components and merge incoming events into the Zustand store, providing real-time collaboration without polling.

---

## Section 4: Database Design

### 4.1 How do you ensure data integrity in a multi-tenant system?

Data integrity is enforced at multiple levels: (1) **Foreign keys** with CASCADE deletes ensure orphan records are impossible, (2) **Unique constraints** (`[tenantId, email]` on users, `[projectId, userId]` on members) prevent duplicates, (3) **Application-layer filtering** ensures every query includes `tenantId`.

For additional safety, PostgreSQL Row-Level Security (RLS) policies could enforce `tenant_id = current_setting('app.current_tenant')` at the database level, making data leaks impossible even with application bugs.

### 4.2 Explain your indexing strategy

We index based on query patterns: `tenantId` on every table (all queries filter by tenant), `email` on users (login lookups), `[projectId, status]` on tasks (Kanban column queries), and `[recipientId, isRead]` on notifications (unread badge count). Foreign key columns are indexed by Prisma's `@relation` directive automatically.

We avoid over-indexing — each index adds write overhead. We'd use `EXPLAIN ANALYZE` in production to identify slow queries and add indexes reactively.

### 4.3 How do you handle schema migrations?

Prisma provides two migration strategies. For development, `prisma db push` introspects the schema and applies changes directly — fast iteration without migration files. For production, `prisma migrate dev` generates versioned SQL migration files that can be code-reviewed and applied via CI/CD.

We use `directUrl` (session pooler, port 5432) for migrations because pgbouncer (transaction pooler) doesn't support the prepared statements that Prisma migrations use.

### 4.4 How do you model hierarchical data?

Tasks support subtasks via a self-referential relationship: `parentId` references the same `tasks` table. This adjacency list model is simple and efficient for shallow hierarchies (2-3 levels). For deep hierarchies (unlimited nesting), we'd consider **materialized path** (storing `/root/child/grandchild` as a string) or **closure table** patterns.

Comments also support threading via the same pattern — `parentId` on the `comments` table enables reply chains.

### 4.5 What's your approach to soft deletes vs hard deletes?

We use **soft deletes for projects** (status changed to "archived" instead of row deletion) because projects contain significant historical data. This allows recovery and preserves audit trails.

For refresh tokens, we use **hard deletes** on logout/rotation — there's no value in keeping expired tokens. For other entities (tasks, comments), we currently use hard deletes with CASCADE, but would add a `deleted_at` column for enterprise customers who require data retention compliance.

---

## Section 5: Frontend Engineering

### 5.1 How do you structure a React application?

We use a **feature-based structure** with clear boundaries: `api/` (typed HTTP functions), `stores/` (Zustand state management), `components/` (split into `ui/`, `layout/`, and feature-specific directories), `pages/` (route-level components), and `types/` (shared TypeScript interfaces).

This structure scales better than "group by type" (all components in one folder) because related code is colocated. A developer working on tasks only touches files in `tasks/`, `stores/taskStore.ts`, and `api/tasks.api.ts`.

### 5.2 Explain your state management approach

We chose **Zustand** over Redux for its minimal boilerplate and built-in TypeScript support. Each domain has its own store: `authStore` (user, token, login/logout), `projectStore` (CRUD operations), `taskStore` (Kanban state with optimistic updates).

Auth state is hydrated from localStorage on app load (`hydrate()` in App.tsx's `useEffect`). Stores call the API layer directly and update state on success. The `taskStore.updateTaskStatus` uses optimistic updates — it modifies local state immediately and reverts on API failure.

### 5.3 How do you handle authentication on the frontend?

The Axios client includes a request interceptor that attaches the JWT from localStorage to every request. A response interceptor catches 401s, attempts a token refresh (POST `/auth/refresh` using the HTTP-only cookie), and replays the original request with the new token.

Route protection is handled by `ProtectedRoute` and `PublicRoute` wrapper components that check `authStore.isAuthenticated` and redirect accordingly. This prevents unauthenticated access to protected pages and prevents authenticated users from seeing the login page.

### 5.4 How do you handle forms and validation?

We use **react-hook-form** for performant form handling (uncontrolled components, no re-renders on every keystroke) with **Zod** schemas via `@hookform/resolvers`. Each form defines a Zod schema, infers the TypeScript type, and passes it to `useForm<FormData>({ resolver: zodResolver(schema) })`.

Field errors are displayed inline below each input. Form-level errors (from API responses) are shown in a colored banner. The submit button shows a loading spinner during API calls to prevent double-submission.

### 5.5 How do you optimize frontend performance?

Key optimizations in our app: (1) **Zustand selectors** — components subscribe to specific state slices, not the entire store, (2) **Optimistic updates** — Kanban drag-drop updates UI instantly without waiting for API, (3) **Pagination** — list endpoints return pages, not entire datasets, (4) **Code splitting** — Vite's built-in chunk splitting for lazy-loaded routes.

Future optimizations would include: React.lazy for route-level code splitting, SWR/TanStack Query for request deduplication and caching, and virtual scrolling for large task lists.

---

## Section 6: Full Stack Integration

### 6.1 How do frontend and backend communicate?

The frontend uses a typed Axios client (`api/client.ts`) configured with `baseURL`, `withCredentials: true`, and JWT interceptors. Each API module (auth, projects, tasks) exports typed functions that map 1:1 to backend endpoints.

The TypeScript interfaces in `types/index.ts` match the backend's Prisma model shapes, ensuring type safety across the stack. API response types use generics: `ApiResponse<Project>`, `ApiResponse<{ tasks: Task[]; total: number }>`.

### 6.2 How do you keep frontend and backend types in sync?

Currently, types are manually mirrored in the frontend `types/index.ts`. For a production system, we'd use one of: (a) **Prisma's generated types** exported as a shared package in the monorepo, (b) **OpenAPI/Swagger** schema generation from Zod schemas, or (c) **tRPC** for end-to-end type safety without REST.

### 6.3 How do you handle loading and error states?

Every store has `loading` and `error` properties. Components check these to render appropriate UI: loading spinners during fetches, error banners on failures, empty states when data is empty. The pattern is consistent across all pages.

### 6.4 How do you handle optimistic updates?

The `taskStore.updateTaskStatus` method demonstrates optimistic updates: (1) immediately update local state, (2) fire API call, (3) on failure, revert local state. This makes drag-and-drop feel instant while maintaining data consistency.

### 6.5 Describe your CORS configuration

The backend uses `cors({ origin: process.env.CORS_ORIGIN, credentials: true })`. The `credentials: true` setting allows the browser to send/receive cookies (refresh token) cross-origin. The frontend Axios client sets `withCredentials: true` to match. In production, `CORS_ORIGIN` is set to the exact frontend domain — no wildcards.

---

## Section 7: Performance & Scalability

### 7.1 How do you optimize database queries?

We use: (1) **Selective includes** — only load related data when needed (e.g., `select: { id, firstName, lastName }` instead of full user objects), (2) **Parallel queries** — `Promise.all([findMany, count])` for paginated lists, (3) **Composite indexes** — `[projectId, status]` for Kanban queries, (4) **Connection pooling** via Supabase Supavisor.

### 7.2 How would you implement caching?

Layer 1: **Redis** for frequently accessed data (user sessions, project listings, permission checks). Layer 2: **HTTP caching** with ETags for static-ish data (project details change infrequently). Layer 3: **Frontend caching** with TanStack Query's stale-while-revalidate pattern.

Cache invalidation would be event-driven — when a project is updated, invalidate its cache key. For multi-server deployments, Redis pub/sub ensures all instances invalidate simultaneously.

### 7.3 How do you handle concurrent updates?

Currently, last-write-wins. For production, we'd add **optimistic concurrency control** using an `updatedAt` timestamp. The client sends the last-known `updatedAt` with update requests; the server rejects the update if the timestamp doesn't match (409 Conflict), forcing the client to refresh and retry.

### 7.4 How do you handle background jobs?

Activity logging already uses a fire-and-forget pattern. For heavier work (email notifications, report generation, file processing), we'd use **BullMQ** with Redis as the job queue. The API enqueues a job and responds immediately; a worker process handles the job asynchronously.

### 7.5 What are your strategies for handling high traffic?

(1) **Horizontal scaling** — stateless API behind a load balancer, (2) **Database read replicas** for read-heavy endpoints, (3) **CDN** for frontend assets, (4) **Rate limiting** to prevent abuse, (5) **Pagination** to limit response sizes, (6) **Redis caching** for hot data.

---

## Section 8: Security

### 8.1 How do you prevent common web vulnerabilities?

**XSS:** React auto-escapes all rendered content. Helmet.js sets CSP headers. **SQL Injection:** Prisma uses parameterized queries — user input never touches raw SQL. **CSRF:** SameSite=Strict cookies + CORS origin validation. **SSRF:** No user-controlled URLs in server-side requests. **Clickjacking:** Helmet sets X-Frame-Options to DENY.

### 8.2 How do you securely store passwords?

We use **bcrypt with 12 salt rounds**. The salt is embedded in the hash string, so no separate salt storage is needed. We never store plaintext passwords, and the hash is excluded from all API responses via Prisma's `select` clause.

The password reset flow generates a crypto-random token, stores its SHA-256 hash (not the raw token) with an expiry timestamp, and validates by hashing the submitted token and comparing.

### 8.3 How do you handle token security?

Access tokens are short-lived (15 min) and stored in localStorage. Refresh tokens are long-lived (7 days), stored as HTTP-only cookies (immune to XSS), and hashed before database storage (immune to database leaks). Token rotation on every refresh prevents replay attacks.

### 8.4 How do you implement rate limiting?

We use `express-rate-limit` with a sliding window (15 min, 100 requests per IP). In production, we'd use a Redis-backed store for distributed rate limiting across multiple server instances. Auth endpoints would have stricter limits (5 attempts per minute).

### 8.5 How do you handle sensitive data in logs?

Winston logger is configured to never log passwords, tokens, or full request bodies. Error logs include user ID and tenant ID for debugging but never credentials. In production, log output would be JSON-formatted for machine parsing with PII fields redacted.

---

## Section 9: Problem Solving & Real Scenarios

### 9.1 A user reports they can see another tenant's data

**Situation:** A customer reports seeing projects that don't belong to their organization.

**Task:** Identify the data leak, fix it, and prevent recurrence.

**Action:** (1) Check the user's JWT to verify their `tenantId`, (2) Query the `projects` table for the leaked project's `tenant_id` — confirm it's different from the user's, (3) Search the codebase for any query that doesn't filter by `tenantId`, (4) In our implementation, every service method requires `tenantId` as a parameter — so the leak would likely be in a new, unreviewed endpoint.

**Result:** Add a middleware that automatically injects `tenantId` from `req.user` into `req.query` for all tenant-scoped routes. Add integration tests that verify cross-tenant queries return empty results. Consider adding PostgreSQL RLS as a database-level safety net.

### 9.2 The API is responding slowly under load

**Situation:** Response times increase from 200ms to 5s during peak hours.

**Task:** Identify the bottleneck and optimize.

**Action:** (1) Check database connection pool — are connections exhausted? (Supabase dashboard shows active connections), (2) Run `EXPLAIN ANALYZE` on the slowest queries — look for sequential scans, (3) Check for N+1 queries in Prisma includes (use `findMany` with `include` instead of loops), (4) Add Redis caching for read-heavy endpoints (project listings, user lookups).

**Result:** In our case, the initial Supabase connection had high latency (~2s) due to the regional pooler. We resolved it by using the correct regional endpoint (`aws-1-ap-northeast-1`) and ensuring pgbouncer mode for connection reuse.

### 9.3 JWT refresh tokens are being stolen

**Situation:** Users report being logged out, and unauthorized API calls are appearing in audit logs.

**Task:** Investigate the token theft vector and mitigate.

**Action:** (1) Our refresh tokens are HTTP-only cookies — not accessible via JavaScript, ruling out XSS, (2) Check for CSRF — our cookies use SameSite=Strict, (3) Check if tokens are being leaked via server logs or error messages, (4) Implement **refresh token families** — when a token is reused (indicating theft), revoke all tokens for that user.

**Result:** Implement token family tracking (add `familyId` to refresh tokens). If a rotated-out token is replayed, it means the family is compromised — delete all tokens in that family, forcing re-authentication on all devices.

### 9.4 Database migration fails in production

**Situation:** A Prisma migration times out on a table with millions of rows.

**Task:** Apply the schema change without downtime.

**Action:** (1) Never run `ALTER TABLE` on large tables during peak hours, (2) Use Prisma's `prisma migrate deploy` (not `dev`) in production, (3) For adding a column, use `ALTER TABLE ... ADD COLUMN ... DEFAULT ...` which is near-instant in PostgreSQL 11+ (doesn't rewrite the table), (4) For adding an index, use `CREATE INDEX CONCURRENTLY` to avoid locking.

**Result:** Schedule migrations during low-traffic windows. For our Supabase setup, use the `DIRECT_URL` (session pooler) for migrations. Always test migrations against a staging database with production-scale data first.

### 9.5 Frontend bundle is too large, causing slow initial load

**Situation:** Lighthouse reports a 2MB JavaScript bundle with a 4s Time to Interactive.

**Task:** Reduce bundle size and improve initial load performance.

**Action:** (1) Analyze the bundle with `npx vite-bundle-analyzer`, (2) Implement route-level code splitting with `React.lazy()` and `Suspense`, (3) Move heavy libraries (chart.js, date-fns) to dynamic imports, (4) Enable gzip/brotli compression on the CDN, (5) Use Vite's `build.rollupOptions.output.manualChunks` to split vendor code.

**Result:** Our current bundle is already lean (React + Zustand + Axios + Zod + Lucide = ~200KB gzipped). For future growth, we'd implement route-based splitting and load the Kanban board lazily since it's the heaviest component.
