# 🚀 ProjectMgr — Multi-Tenant Project Management SaaS

> Enterprise-grade project management platform with Kanban boards, RBAC, and real-time collaboration — built as a full-stack TypeScript monorepo.

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)

**Demo Credentials:** `admin@demo.com` / `Demo123!@#`

---

## ✅ Features

- ✅ **Multi-tenant architecture** — Complete data isolation via `tenant_id` on every table
- ✅ **JWT authentication** — Access tokens (15 min) + refresh token rotation with HTTP-only cookies
- ✅ **Role-based access control** — Admin / Manager / Member with middleware enforcement
- ✅ **Projects CRUD** — Create, list, update, archive with member management
- ✅ **Kanban task board** — Drag-and-drop with optimistic status updates
- ✅ **Activity logging** — Immutable audit trail for all CUD operations
- ✅ **Notifications** — Auto-generated on task assignments and project invites
- ✅ **Responsive dark theme** — Glassmorphism UI with Inter typography
- ✅ **Form validation** — Zod schemas on both client and server
- ✅ **Optimistic UI** — Instant feedback on Kanban drag-drop, server sync in background

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  Vite + TypeScript + Tailwind + Zustand + React Router  │
│         http://localhost:5173                            │
└──────────────────────┬──────────────────────────────────┘
                       │ Axios (JWT in Authorization header)
                       │ withCredentials: true (refresh cookies)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (Express)                      │
│  Node.js + TypeScript + Prisma ORM + Socket.IO          │
│         http://localhost:3000/api/v1                     │
│                                                          │
│  Middleware Chain:                                        │
│  Helmet → CORS → Rate Limit → Auth → RBAC → Validate   │
└──────────────────────┬──────────────────────────────────┘
                       │ Prisma Client (connection pooling)
                       ▼
┌─────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL / Supabase)             │
│  13 tables │ UUID primary keys │ tenant_id on every row  │
│  Indexes on FKs, search fields, composite keys           │
└─────────────────────────────────────────────────────────┘
```

**Multi-tenancy:** Shared database, application-level isolation. Every query filters by `tenantId` — enforced in service layer, not optional.

**Auth flow:** Login → bcrypt verify → issue JWT access token (15 min) + refresh token (7 days, stored hashed in DB) → refresh token set as HTTP-only cookie → interceptor auto-refreshes on 401.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 22 | Server-side JavaScript |
| Backend Framework | Express 5 | HTTP routing, middleware |
| Frontend Framework | React 18 | Component-based UI |
| Language | TypeScript 5.7 | Type safety across stack |
| Database | PostgreSQL 16 | Relational data store |
| Cloud DB | Supabase | Managed Postgres + pooling |
| ORM | Prisma 6 | Type-safe database access |
| Auth | JWT (jsonwebtoken) | Stateless authentication |
| Password Hashing | bcrypt (12 rounds) | Secure credential storage |
| Validation | Zod | Runtime schema validation |
| Styling | Tailwind CSS 3.4 | Utility-first CSS |
| State Management | Zustand 5 | Lightweight React stores |
| Forms | react-hook-form + Zod | Performant form handling |
| HTTP Client | Axios | API requests with interceptors |
| Icons | Lucide React | Consistent icon set |
| Realtime | Socket.IO | WebSocket infrastructure |
| Dev Server | Vite 6 | Fast HMR for frontend |
| Process Manager | nodemon + ts-node | Backend hot reload |

---

## 📁 Project Structure

```
YNC/
├── apps/
│   ├── server/                    # Express backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # 13-table multi-tenant schema
│   │   │   └── seed.ts            # Demo data seeding
│   │   └── src/
│   │       ├── config/            # DB, JWT, Socket.IO setup
│   │       ├── middleware/        # Auth, RBAC, validation, errors
│   │       ├── modules/
│   │       │   ├── auth/          # Register, login, refresh, logout
│   │       │   ├── projects/      # CRUD + member management
│   │       │   └── tasks/         # CRUD + Kanban + assignments
│   │       ├── types/             # Express type augmentation
│   │       └── utils/             # Logger, activity logger
│   │
│   └── client/                    # React frontend
│       └── src/
│           ├── api/               # Typed API layer (auth, projects, tasks)
│           ├── components/
│           │   ├── layout/        # AppShell, Navbar, Sidebar
│           │   ├── projects/      # ProjectCard, CreateProjectModal
│           │   ├── tasks/         # KanbanBoard, TaskCard, modals
│           │   └── ui/            # Button, Input, Modal, Badge
│           ├── pages/             # Login, Register, Dashboard, Projects, ProjectDetail
│           ├── stores/            # Zustand (auth, project, task)
│           ├── types/             # TypeScript interfaces
│           └── lib/               # Utils, status/priority config
│
├── package.json                   # Root monorepo config
├── docker-compose.yml             # Local PostgreSQL
└── .env.example                   # Environment template
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (recommended: 22)
- **npm** 9+
- **PostgreSQL 16** (local) or **Supabase account** (cloud)

### Setup

```bash
# 1. Clone repository
git clone <repo-url> && cd YNC

# 2. Install all dependencies (monorepo)
npm install

# 3. Configure environment
cp apps/server/.env.example apps/server/.env
# Edit .env with your database URL and generate JWT secrets

# 4. Push schema to database
cd apps/server
npx prisma db push

# 5. Seed demo data
npx prisma db seed

# 6. Start backend (terminal 1)
npm run dev

# 7. Start frontend (terminal 2)
cd ../client
npm run dev

# 8. Open browser
# → http://localhost:5173
# → Login: admin@demo.com / Demo123!@#
```

---

## 🔐 Environment Variables

```env
# ─── Database (Supabase) ───────────────────────────
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# ─── JWT ───────────────────────────────────────────
JWT_ACCESS_SECRET="<64-char-random-string>"
JWT_REFRESH_SECRET="<64-char-random-string>"

# ─── Server ───────────────────────────────────────
NODE_ENV="development"
PORT="3000"

# ─── CORS ──────────────────────────────────────────
CORS_ORIGIN="http://localhost:5173"

# ─── Rate Limiting ─────────────────────────────────
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"
```

---

## 📡 API Documentation

### Auth (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ❌ | Create tenant + admin user |
| POST | `/login` | ❌ | Authenticate, return JWT + set cookie |
| POST | `/refresh` | 🍪 | Rotate refresh token, issue new access token |
| POST | `/logout` | 🍪 | Revoke refresh token, clear cookie |
| POST | `/password-reset/request` | ❌ | Generate password reset token |
| POST | `/password-reset/confirm` | ❌ | Reset password with token |

### Projects (`/api/v1/projects`)

| Method | Endpoint | Auth | RBAC | Description |
|--------|----------|------|------|-------------|
| GET | `/` | ✅ | Any | List projects (paginated, searchable) |
| POST | `/` | ✅ | Admin/Manager | Create project |
| GET | `/:id` | ✅ | Member | Get project with members + task stats |
| PUT | `/:id` | ✅ | Owner/Admin | Update project |
| DELETE | `/:id` | ✅ | Admin/Manager | Archive project (soft delete) |
| POST | `/:id/members` | ✅ | Admin/Manager | Add member + send notification |
| DELETE | `/:id/members/:userId` | ✅ | Admin/Manager | Remove member |

### Tasks (`/api/v1`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/projects/:projectId/tasks` | ✅ | List tasks (filterable by status/assignee/priority) |
| POST | `/projects/:projectId/tasks` | ✅ | Create task (auto-notify assignee) |
| GET | `/tasks/:id` | ✅ | Get task with comments, labels |
| PUT | `/tasks/:id` | ✅ | Update task fields |
| PATCH | `/tasks/:id/status` | ✅ | Quick status change (Kanban) |
| PATCH | `/tasks/:id/assign` | ✅ | Assign task + notify |
| PATCH | `/tasks/:id/reorder` | ✅ | Update position for ordering |
| DELETE | `/tasks/:id` | ✅ | Delete task (Admin/Manager) |

---

## 🗄️ Database Schema

```mermaid
erDiagram
    TENANT ||--o{ USER : "has"
    TENANT ||--o{ PROJECT : "has"
    TENANT ||--o{ TASK : "has"
    TENANT ||--o{ NOTIFICATION : "has"
    TENANT ||--o{ ACTIVITY_LOG : "has"

    USER ||--o{ PROJECT : "owns"
    USER ||--o{ PROJECT_MEMBER : "belongs to"
    USER ||--o{ TASK : "assigned"
    USER ||--o{ TASK : "reported"
    USER ||--o{ COMMENT : "authors"
    USER ||--o{ REFRESH_TOKEN : "has"

    PROJECT ||--o{ PROJECT_MEMBER : "has"
    PROJECT ||--o{ TASK : "contains"

    TASK ||--o{ COMMENT : "has"
    TASK ||--o{ TASK_LABEL : "tagged"
    TASK ||--o{ ATTACHMENT : "has"

    LABEL ||--o{ TASK_LABEL : "applied"
    COMMENT ||--o{ ATTACHMENT : "has"
```

**13 tables:** Tenant, User, Project, ProjectMember, Task, Label, TaskLabel, Comment, Attachment, Notification, ActivityLog, RefreshToken

**Key design decisions:**
- UUIDs for all primary keys (no sequential IDs for security)
- `tenant_id` on every data table (enforced isolation)
- Composite unique `[tenantId, email]` on users (same email in different tenants)
- Composite index `[projectId, status]` on tasks (Kanban column queries)
- Soft deletes on projects (archive instead of destroy)

---

## 🔒 Security Features

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcrypt with 12 salt rounds |
| JWT short expiry | 15 min access token lifespan |
| Refresh token rotation | New token on each refresh, old deleted |
| HTTP-only cookies | Refresh token stored in `httpOnly` cookie |
| Rate limiting | 100 req/15 min on `/api` endpoints |
| Input validation | Zod schemas on all endpoints (server + client) |
| SQL injection prevention | Prisma parameterized queries |
| XSS protection | React auto-escaping + Helmet headers |
| CORS | Explicit origin whitelist, credentials mode |
| Security headers | Helmet.js (CSP, HSTS, etc.) |
| Tenant isolation | Application-layer `tenantId` filtering |

---

## 📈 Scalability Considerations

**Current architecture supports:**
- Stateless API → horizontal scaling behind a load balancer
- Database indexes on all foreign keys and search fields
- Pagination on all list endpoints (configurable limit)
- Optimistic UI updates → reduced server round-trips
- Connection pooling via Supabase Supavisor

**Future scaling path:**
- Redis for session caching and rate limiting
- Background job queue (BullMQ) for notifications, emails
- CDN (CloudFront/Cloudflare) for static assets
- Read replicas for database query distribution
- Microservices for notification and file processing
- PostgreSQL Row-Level Security for defense-in-depth

---

## 🧪 Testing

- **Backend services** tested via PowerShell/curl against live endpoints
- **All 21 API endpoints** verified with expected responses
- **RBAC enforcement** tested (member blocked from admin operations)
- **Tenant isolation** verified (separate org sees separate data)

**Future:** Jest unit tests, Supertest integration tests, Playwright E2E tests

---

## 🚢 Deployment

| Component | Recommended | Alternative |
|-----------|-------------|-------------|
| Backend | Render / Railway | Fly.io, AWS ECS |
| Frontend | Vercel | Netlify, Cloudflare Pages |
| Database | Supabase | Neon, PlanetScale, RDS |

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions.

---

## 🔮 What I Would Add With More Time

- Real-time collaboration via Socket.IO (infrastructure ready)
- File uploads to S3/Cloudinary with presigned URLs
- Threaded comments on tasks
- Email notifications via SendGrid/Resend
- Advanced search with full-text PostgreSQL indexes
- Team analytics dashboard with charts
- Activity timeline view per project
- Mobile app with React Native
- PostgreSQL Row-Level Security policies
- Comprehensive test coverage (>80%)
- Monitoring with Prometheus + Grafana
- CI/CD pipeline with GitHub Actions

---

## ⚠️ Known Limitations

- Real-time Socket.IO events not yet wired to frontend (infrastructure ready)
- Task drag-drop updates single task position but doesn't auto-reorder siblings
- No email service integration (password reset tokens logged to console)
- Activity logs stored in DB but not yet exposed in the UI

---

## 📄 License

MIT License — Built for the YNC Pakistan Technical Assessment

**Author:** Afnan Awan
