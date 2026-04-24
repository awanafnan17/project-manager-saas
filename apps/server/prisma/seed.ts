import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function log(emoji: string, message: string) {
  console.log(`  ${emoji}  ${message}`);
}

// ─── Main Seed Function ───────────────────────────────────

async function main() {
  console.log('\n🌱 Seeding database...\n');

  // ── 1. Clear existing data (reverse FK order) ───────────

  log('🧹', 'Clearing existing data...');

  await prisma.refreshToken.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.taskLabel.deleteMany();
  await prisma.label.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  log('✅', 'All tables cleared');

  // ── 2. Create Tenant ────────────────────────────────────

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Corporation',
      slug: 'demo-corporation',
      plan: 'pro',
      settings: {
        maxProjects: 50,
        maxMembers: 25,
        features: ['kanban', 'gantt', 'reports'],
      },
    },
  });

  log('🏢', `Tenant: "${tenant.name}" (${tenant.id})`);

  // ── 3. Create Users ─────────────────────────────────────

  const password = await hashPassword('Demo123!@#');

  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@demo.com',
      passwordHash: password,
      firstName: 'Sarah',
      lastName: 'Admin',
      role: 'admin',
      isActive: true,
    },
  });

  const manager = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'manager@demo.com',
      passwordHash: password,
      firstName: 'Mike',
      lastName: 'Manager',
      role: 'manager',
      isActive: true,
    },
  });

  const member = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'member@demo.com',
      passwordHash: password,
      firstName: 'Alex',
      lastName: 'Member',
      role: 'member',
      isActive: true,
    },
  });

  log('👤', `Admin:   ${admin.email} (${admin.id})`);
  log('👤', `Manager: ${manager.email} (${manager.id})`);
  log('👤', `Member:  ${member.email} (${member.id})`);

  // ── 4. Create Projects ──────────────────────────────────

  const project1 = await prisma.project.create({
    data: {
      tenantId: tenant.id,
      name: 'Website Redesign',
      description: 'Complete overhaul of the company website with modern design, improved UX, and mobile-first approach.',
      status: 'active',
      priority: 'high',
      ownerId: admin.id,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-07-31'),
    },
  });

  const project2 = await prisma.project.create({
    data: {
      tenantId: tenant.id,
      name: 'Mobile App MVP',
      description: 'Build and launch the first version of our mobile application for iOS and Android.',
      status: 'active',
      priority: 'medium',
      ownerId: admin.id,
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-09-30'),
    },
  });

  log('📁', `Project: "${project1.name}" (${project1.id})`);
  log('📁', `Project: "${project2.name}" (${project2.id})`);

  // ── 5. Add Project Members ──────────────────────────────

  const memberRoles = [
    { projectId: project1.id, userId: admin.id, role: 'owner' },
    { projectId: project1.id, userId: manager.id, role: 'manager' },
    { projectId: project1.id, userId: member.id, role: 'member' },
    { projectId: project2.id, userId: admin.id, role: 'owner' },
    { projectId: project2.id, userId: manager.id, role: 'manager' },
    { projectId: project2.id, userId: member.id, role: 'member' },
  ];

  await prisma.projectMember.createMany({ data: memberRoles });

  log('👥', `${memberRoles.length} project memberships created`);

  // ── 6. Create Labels ────────────────────────────────────

  const bugLabel = await prisma.label.create({
    data: { tenantId: tenant.id, name: 'Bug', color: '#ef4444' },
  });

  const featureLabel = await prisma.label.create({
    data: { tenantId: tenant.id, name: 'Feature', color: '#3b82f6' },
  });

  log('🏷️ ', `Labels: Bug (red), Feature (blue)`);

  // ── 7. Create Tasks ─────────────────────────────────────

  const task1 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      projectId: project1.id,
      title: 'Design new landing page mockups',
      description: 'Create high-fidelity mockups for the homepage, about page, and pricing page using Figma.',
      status: 'done',
      priority: 'high',
      position: 0,
      assigneeId: member.id,
      reporterId: admin.id,
      dueDate: new Date('2026-05-15'),
      estimatedHrs: 16,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      projectId: project1.id,
      title: 'Implement responsive navigation component',
      description: 'Build a responsive nav bar with hamburger menu for mobile, supporting nested dropdowns.',
      status: 'in_progress',
      priority: 'high',
      position: 1,
      assigneeId: member.id,
      reporterId: manager.id,
      dueDate: new Date('2026-05-25'),
      estimatedHrs: 8,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      projectId: project1.id,
      title: 'Set up CI/CD pipeline for staging',
      description: 'Configure GitHub Actions for automated testing, building, and deployment to staging environment.',
      status: 'todo',
      priority: 'medium',
      position: 2,
      assigneeId: manager.id,
      reporterId: admin.id,
      dueDate: new Date('2026-06-01'),
      estimatedHrs: 6,
    },
  });

  const task4 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      projectId: project2.id,
      title: 'Set up React Native project scaffolding',
      description: 'Initialize the React Native project with TypeScript, navigation, and state management libraries.',
      status: 'done',
      priority: 'high',
      position: 0,
      assigneeId: manager.id,
      reporterId: admin.id,
      dueDate: new Date('2026-05-10'),
      estimatedHrs: 4,
    },
  });

  const task5 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      projectId: project2.id,
      title: 'Implement authentication screens',
      description: 'Build login, register, and forgot password screens with form validation and API integration.',
      status: 'in_progress',
      priority: 'high',
      position: 1,
      assigneeId: member.id,
      reporterId: manager.id,
      dueDate: new Date('2026-06-15'),
      estimatedHrs: 20,
    },
  });

  const task6 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      projectId: project2.id,
      title: 'Design app icon and splash screen',
      description: 'Create app icon (1024x1024), adaptive icons for Android, and animated splash screen.',
      status: 'todo',
      priority: 'low',
      position: 2,
      assigneeId: null,
      reporterId: admin.id,
      dueDate: new Date('2026-07-01'),
      estimatedHrs: 3,
    },
  });

  log('📋', `6 tasks created (2 done, 2 in progress, 2 todo)`);

  // ── 8. Assign Labels to Tasks ───────────────────────────

  await prisma.taskLabel.createMany({
    data: [
      { taskId: task2.id, labelId: bugLabel.id },
      { taskId: task3.id, labelId: featureLabel.id },
      { taskId: task5.id, labelId: featureLabel.id },
      { taskId: task6.id, labelId: featureLabel.id },
    ],
  });

  log('🔗', '4 task-label associations created');

  // ── 9. Create Comments ──────────────────────────────────

  await prisma.comment.create({
    data: {
      tenantId: tenant.id,
      taskId: task1.id,
      authorId: admin.id,
      body: 'The mockups look fantastic! Let\'s move forward with option B for the hero section. Great work on the animations.',
    },
  });

  await prisma.comment.create({
    data: {
      tenantId: tenant.id,
      taskId: task2.id,
      authorId: manager.id,
      body: 'Make sure the nav supports keyboard navigation and proper ARIA labels for accessibility. Check WCAG 2.1 AA compliance.',
    },
  });

  await prisma.comment.create({
    data: {
      tenantId: tenant.id,
      taskId: task5.id,
      authorId: member.id,
      body: 'I\'ve integrated the biometric authentication for iOS. Still working on the Android fingerprint API — should be done by EOD.',
    },
  });

  log('💬', '3 comments created');

  // ── Done! ───────────────────────────────────────────────

  console.log('\n' + '═'.repeat(50));
  console.log('✅ Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log('   • 1 tenant (Demo Corporation)');
  console.log('   • 3 users (admin, manager, member)');
  console.log('   • 2 projects with 6 memberships');
  console.log('   • 6 tasks (2 done, 2 in-progress, 2 todo)');
  console.log('   • 2 labels, 4 task-label links');
  console.log('   • 3 comments');
  console.log('\n🔑 Login credentials:');
  console.log('   admin@demo.com   / Demo123!@#');
  console.log('   manager@demo.com / Demo123!@#');
  console.log('   member@demo.com  / Demo123!@#\n');
}

// ─── Execute ──────────────────────────────────────────────

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
