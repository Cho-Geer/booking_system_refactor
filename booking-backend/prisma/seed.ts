import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { seedDefaultTranslations } from '../src/modules/translations/translations-seed.service';

// SHA-256 with pepper (matches HashService logic)
const PII_HASH_PEPPER = process.env.PII_HASH_PEPPER || 'default-pepper-change-in-production';
function hashWithPepper(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value + PII_HASH_PEPPER)
    .digest('hex');
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

export async function main(prisma?: PrismaClient) {
  const db = prisma || new PrismaClient();
  console.log('🌱 Starting database seed...');

  // Seed translations (idempotent)
  console.log('🌍 Seeding default translations...');
  await seedDefaultTranslations(db);
  console.log('✅ Default translations seeded');

  // Create admin user (三字段 PII 加密模型) — idempotent: safe to run repeatedly
  const adminEmail = 'zhaoge.tzx@gmail.com';
  const adminPhone = '+86-138-0000-0001';
  const adminPassword = 'Admin@123456';

  // bcrypt with rounds=12 (OWASP 2023)
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const emailHash = hashWithPepper(adminEmail);
  let admin = await db.user.findFirst({ where: { emailHash } });

  if (!admin) {
    try {
      admin = await db.user.create({
        data: {
          name: 'System Admin',
          email: maskEmail(adminEmail),
          emailHash,
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
    } catch (err: any) {
      // If user was created by a concurrent run or previous failed attempt
      if (err?.code === 'P2002') {
        admin = await db.user.findFirst({ where: { emailHash } });
        console.log('⚠️ Admin user already exists, skipped creation:', admin?.email);
      } else {
        throw err;
      }
    }
  } else {
    console.log('⚠️ Admin user already exists, skipped creation:', admin.email);
  }

  // Create super admin user (三字段 PII 加密模型) — idempotent: safe to run repeatedly
  const superAdminEmail = 'zhaogeyinzuo@outlook.com';
  const superAdminPhone = '+86-138-0000-0002';
  const superAdminPassword = 'Zhaoge@2026';

  const superAdminEmailHash = hashWithPepper(superAdminEmail);
  const superAdminHashedPassword = await bcrypt.hash(superAdminPassword, 12);
  let superAdmin = await db.user.findFirst({ where: { emailHash: superAdminEmailHash } });

  if (!superAdmin) {
    try {
      superAdmin = await db.user.create({
        data: {
          name: 'Super Admin',
          email: maskEmail(superAdminEmail),
          emailHash: superAdminEmailHash,
          emailEncrypted: '', // 需要加密服务运行时生成，种子数据留空
          phone: maskPhone(superAdminPhone),
          phoneHash: hashWithPepper(superAdminPhone),
          phoneEncrypted: '', // 需要加密服务运行时生成，种子数据留空
          passwordHash: superAdminHashedPassword,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
        },
      });
      console.log('✅ Created super admin user (PII encrypted model):', superAdmin.email);
    } catch (err: any) {
      // If user was created by a concurrent run or previous failed attempt
      if (err?.code === 'P2002') {
        superAdmin = await db.user.findFirst({ where: { emailHash: superAdminEmailHash } });
        console.log('⚠️ Super admin user already exists, skipped creation:', superAdmin?.email);
      } else {
        throw err;
      }
    }
  } else {
    console.log('⚠️ Super admin user already exists, skipped creation:', superAdmin.email);
  }

  // Create service categories
  const categories = [
    { name: 'Consulting', description: 'Professional consulting services', displayOrder: 1 },
    { name: 'Training', description: 'Training and education services', displayOrder: 2 },
    { name: 'Support', description: 'Technical support services', displayOrder: 3 },
  ];

  for (const cat of categories) {
    const existing = await db.serviceCategory.findFirst({
      where: { name: cat.name },
    });
    if (!existing) {
      await db.serviceCategory.create({ data: cat });
    }
  }
  console.log('✅ Created service categories');

  // Create sample services
  const consultingCategory = await db.serviceCategory.findFirst({
    where: { name: 'Consulting' },
  });

  if (consultingCategory) {
    const services = [
      {
        categoryId: consultingCategory.id,
        name: 'Business Strategy Consulting',
        description: 'One-on-one business strategy consultation',
        durationMinutes: 60,
        price: 500.0,
      },
      {
        categoryId: consultingCategory.id,
        name: 'Technical Architecture Review',
        description: 'Expert review of your system architecture',
        durationMinutes: 90,
        price: 800.0,
      },
    ];

    for (const service of services) {
      const existing = await db.service.findFirst({
        where: { name: service.name },
      });
      if (!existing) {
        await db.service.create({ data: service });
      }
    }
  } // End if (consultingCategory)

  console.log('✅ Created sample services');
  console.log('🎉 Database seeding completed successfully!');
  return db; // Return for test access
}

// Auto-execute only when run directly, not when imported by tests
if (require.main === module) {
  const prisma = new PrismaClient();
  main(prisma)
    .catch((e) => {
      console.error('❌ Seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
