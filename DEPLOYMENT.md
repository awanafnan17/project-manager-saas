# 🚢 Deployment Guide — ProjectMgr

## Option A: Render (Backend) + Vercel (Frontend) + Supabase (DB)

This is the recommended deployment stack for its simplicity and free-tier availability.

---

### Step 1: Database — Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a region close to your users
3. Set a strong database password (save it)
4. After creation, go to **Settings → Database → Connection Pooling**
5. Copy the **Transaction** pooler string (port 6543) → this is your `DATABASE_URL`
6. Copy the **Session** pooler string (port 5432) → this is your `DIRECT_URL`

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

7. Run migrations from your local machine:
```bash
cd apps/server
npx prisma db push
npx prisma db seed
```

---

### Step 2: Backend — Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `projectmgr-api` |
| **Root Directory** | `apps/server` |
| **Runtime** | Node |
| **Build Command** | `npm install && npx prisma generate && npx tsc` |
| **Start Command** | `node dist/index.js` |
| **Instance Type** | Free |

4. Add Environment Variables:

```
DATABASE_URL=<supabase-transaction-pooler-url>
DIRECT_URL=<supabase-session-pooler-url>
JWT_ACCESS_SECRET=<generate-64-char-random>
JWT_REFRESH_SECRET=<generate-64-char-random>
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://projectmgr.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

5. Add Health Check: `/health`
6. Click **Create Web Service**

**Post-deploy verification:**
```bash
curl https://projectmgr-api.onrender.com/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

### Step 3: Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Framework** | Vite |
| **Root Directory** | `apps/client` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

4. Add Environment Variable:
```
VITE_API_URL=https://projectmgr-api.onrender.com/api/v1
```

5. Click **Deploy**

6. Update Render's `CORS_ORIGIN` to your Vercel URL:
```
CORS_ORIGIN=https://projectmgr-[hash].vercel.app
```

---

## Option B: Railway (Full Stack)

Railway supports monorepos and provisions databases natively.

### Setup

1. Go to [railway.app](https://railway.app) → **New Project**
2. **Add PostgreSQL** → copy the `DATABASE_URL`
3. **Add Service** → connect GitHub repo

**Backend service:**
```
Root Directory: apps/server
Build: npm install && npx prisma generate && npx tsc
Start: node dist/index.js
```

**Frontend service:**
```
Root Directory: apps/client
Build: npm run build
Start: npx serve dist
```

4. Set environment variables for both services
5. Railway auto-assigns domains (e.g., `projectmgr-api.up.railway.app`)

---

## 🔧 Troubleshooting

### "Connection refused" or timeout errors
- Verify your ISP supports IPv6 (Supabase direct connections are IPv6-only)
- Use the **pooler** URL instead of the direct `db.xxx.supabase.co` URL
- Ensure `?pgbouncer=true` is appended to `DATABASE_URL`

### Prisma migration fails
- Use `DIRECT_URL` (session pooler, port 5432) for migrations — pgbouncer doesn't support prepared statements
- Run `npx prisma db push` instead of `npx prisma migrate dev` for Supabase

### CORS errors in browser
- Ensure `CORS_ORIGIN` on backend matches the exact frontend URL (no trailing slash)
- Verify `withCredentials: true` is set on the Axios client

### 401 errors after deploy
- Check `JWT_ACCESS_SECRET` is identical on backend
- Verify `localStorage` has the token (browser DevTools → Application → Local Storage)
- Check that the refresh token cookie domain matches

### Build fails on Render
- Ensure `prisma generate` runs before `tsc`
- Check that `@prisma/client` is in `dependencies`, not `devDependencies`

### Frontend shows blank page
- Check browser console for errors
- Verify `VITE_API_URL` environment variable is set correctly
- Ensure the build includes `dist/index.html`
