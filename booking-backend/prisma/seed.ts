import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// SHA-256 with pepper (matches HashService logic)
const PII_HASH_PEPPER = process.env.PII_HASH_PEPPER || 'default-pepper-change-in-production';
function hashWithPepper(value: string): string {
  return crypto.createHash('sha256').update(value + PII_HASH_PEPPER).digest('hex');
}

// Phone/email masking (matches MaskingUtil logic)
function maskPhone(phone: string): string {
  if (phone.length < 7) return '****';
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '****@****';
  const masked = local.length <= 2 ? local + '***' : local.slice(0, 2) + '***';
  return masked + '@' + domain;
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user (三字段 PII 加密模型)
  const adminEmail = 'zhaoge.tzx@gmail.com';
  const adminPhone = '+86-138-0000-0001';
  const adminPassword = 'Admin@123456';

  // bcrypt with rounds=12 (OWASP 2023)
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { emailHash: hashWithPepper(adminEmail) },
    update: {},
    create: {
      name: 'System Admin',
      email: maskEmail(adminEmail),
      emailHash: hashWithPepper(adminEmail),
      emailEncrypted: '', // 需要加密服务运行时生成，种子数据留空
      phone: maskPhone(adminPhone),
      phoneHash: hashWithPepper(adminPhone),
      phoneEncrypted: '', // 需要加密服务运行时生成，种子数据留空
      passwordHash: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Created admin user (PII encrypted model):', admin.email);

  // Create service categories
  const categories = [
    { name: 'Consulting', description: 'Professional consulting services', displayOrder: 1 },
    { name: 'Training', description: 'Training and education services', displayOrder: 2 },
    { name: 'Support', description: 'Technical support services', displayOrder: 3 },
  ];

  for (const cat of categories) {
    const existing = await prisma.serviceCategory.findFirst({
      where: { name: cat.name },
    });
    if (!existing) {
      await prisma.serviceCategory.create({ data: cat });
    }
  }
  console.log('✅ Created service categories');

  // Create sample services
  const consultingCategory = await prisma.serviceCategory.findFirst({
    where: { name: 'Consulting' },
  });

  if (consultingCategory) {
    const services = [
      {
        categoryId: consultingCategory.id,
        name: 'Business Strategy Consulting',
        description: 'One-on-one business strategy consultation',
        durationMinutes: 60,
        price: 500.00,
      },
      {
        categoryId: consultingCategory.id,
        name: 'Technical Architecture Review',
        description: 'Expert review of your system architecture',
        durationMinutes: 90,
        price: 800.00,
      },
    ];

    for (const service of services) {
      const existing = await prisma.service.findFirst({
        where: { name: service.name },
      });
      if (!existing) {
        await prisma.service.create({ data: service });
      }
    }
    console.log('✅ Created sample services');
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
