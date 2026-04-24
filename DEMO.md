# 🎬 Demo Script — ProjectMgr SaaS

This guide walks through the key features for a live demo presentation.

**Setup:** Backend running on `http://localhost:3000`, Frontend on `http://localhost:5173`

---

## 1. 🔐 Login Flow

1. Open `http://localhost:5173` → automatically redirected to `/login`
2. Enter credentials: `admin@demo.com` / `Demo123!@#`
3. Click **Sign In**
4. **What to highlight:**
   - Form validation (try empty fields → see error messages)
   - JWT stored in localStorage (DevTools → Application → Local Storage)
   - Refresh token set as HTTP-only cookie (DevTools → Application → Cookies)
   - Instant redirect to `/dashboard`

---

## 2. 📊 Dashboard Overview

After login, you land on the Dashboard:
- **Welcome message** with user's first name and current date
- **Stats cards:** Projects count (3), Total tasks (7), Role (Admin), Organization plan (Pro)
- **Recent projects** with status and priority badges
- **Quick action:** "+ New Project" button

**What to highlight:** Data is scoped to the logged-in user's tenant only.

---

## 3. 📁 Create a Project

1. Click **Projects** in the sidebar
2. Click **+ New Project** button (top right)
3. Fill in:
   - Name: "Q3 Marketing Campaign"
   - Description: "Launch plan for summer campaign"
   - Priority: High
   - Start Date: Today
   - End Date: 3 months from now
4. Click **Create Project**
5. **What to highlight:**
   - Form validation (try name < 2 chars)
   - Project appears instantly in the grid
   - Owner auto-set to current user
   - Owner auto-added as project member with "manager" role

---

## 4. 👥 View Team Members

1. Click on a project card (e.g., "Website Redesign")
2. See the **Team Members** section showing:
   - Sarah Admin (manager)
   - Mike Manager (member)
   - Alex Member (member)
3. Each member shows avatar initials and role

**What to highlight:** Only members of this project can view tasks. Tenant isolation ensures no cross-org data leaks.

---

## 5. ✏️ Create Tasks

1. On the project detail page, look at the Kanban board
2. Click the **+** button in the "To Do" column
3. Fill in:
   - Title: "Design email templates"
   - Description: "Create HTML templates for campaign emails"
   - Priority: High
   - Assignee: Mike Manager
   - Due Date: Next week
4. Click **Create Task**
5. **What to highlight:**
   - Task appears in the "To Do" column instantly
   - Assignee dropdown populated from project members only
   - Notification auto-created for assignee

---

## 6. 🔄 Kanban Drag-and-Drop

1. Grab the "Design email templates" task card
2. Drag it from **To Do** to **In Progress**
3. **What to highlight:**
   - Optimistic update — UI changes instantly before server confirms
   - Status badge on the card updates
   - Activity log entry created in the database
   - If assignee didn't make the change, they get notified

---

## 7. 👤 Task Assignment & Detail

1. Click on any task card to open the **Task Detail Modal**
2. Change the **Status** dropdown → observe instant update
3. Change the **Assignee** dropdown to a different team member
4. View metadata: reporter, creation date, due date
5. **What to highlight:**
   - Inline editing without leaving the Kanban view
   - Notifications auto-generated on reassignment
   - Delete button (admin/manager only)

---

## 8. 📋 Activity Logging

1. Open browser DevTools → Network tab
2. Create/update/delete a task
3. Check the server logs — you'll see SQL inserts to `activity_logs` table
4. **What to highlight:**
   - Every CUD operation logged with: actor, action, entity, changes (JSON diff)
   - Fire-and-forget pattern — logging failures never block user operations
   - Immutable audit trail for compliance

---

## 9. 🛡️ Role-Based Access Control

1. **Logout** (click logout icon in navbar)
2. Login as **member**: `member@demo.com` / `Demo123!@#`
3. Navigate to `/projects`
4. Notice: **No "+ New Project" button** (members can't create projects)
5. Click on a project → can view tasks, change status
6. **What to highlight:**
   - RBAC enforced at both middleware AND UI level
   - 403 response from API if member tries to POST /projects (test with DevTools)
   - Members can still view and update task status (allowed actions)

---

## 10. 🏢 Multi-Tenant Isolation

1. **Logout** from member account
2. Click **Create one** link to go to `/register`
3. Fill in:
   - Organization: "Rival Corp"
   - Name: "Jane Doe"
   - Email: `jane@rival.com`
   - Password: `TestPass123!`
4. Submit → auto-login → dashboard shows:
   - "Welcome back, Jane 👋"
   - "Rival Corp" in navbar
   - **0 projects, 0 tasks** — completely separate data
5. **What to highlight:**
   - New tenant created with separate UUID
   - Same database, complete data isolation
   - Email uniqueness is per-tenant (same email can exist in different orgs)
   - No visibility into Demo Corporation's data

---

## 🎯 Key Talking Points

1. **Architecture:** Clean separation — API layer → Service layer → Data layer
2. **Security:** bcrypt, JWT rotation, HTTP-only cookies, Zod validation, Helmet
3. **Multi-tenancy:** Application-level isolation, scalable to thousands of tenants
4. **DX:** TypeScript end-to-end, hot reload, Prisma type-safe queries
5. **UX:** Optimistic updates, loading states, error handling, responsive design
