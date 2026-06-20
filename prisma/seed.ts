import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create Admin User
  const adminPassword = await bcrypt.hash('adminpassword', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'Admin User',
      role: 'ADMIN',
      password: adminPassword,
    },
  });
  console.log({ admin });

  // Create Sample Staff User
  const staffPassword = await bcrypt.hash('staffpassword', 10);
  const staff = await prisma.user.upsert({
    where: { username: 'STAFF001' },
    update: {},
    create: {
      username: 'STAFF001',
      name: 'John Doe Staff',
      role: 'STAFF',
      password: staffPassword,
    },
  });
  console.log({ staff });

  // Create Sample Client User
  const clientPassword = await bcrypt.hash('clientpassword', 10);
  const client = await prisma.user.upsert({
    where: { username: 'ABCDE1234F' },
    update: {},
    create: {
      username: 'ABCDE1234F',
      name: 'Client A',
      role: 'CLIENT',
      password: clientPassword,
    },
  });
  console.log({ client });

  // Create Sample Allocation
  const allocation = await prisma.allocation.upsert({
    where: { clientPAN_assessmentYear: { clientPAN: client.username, assessmentYear: '2024-25' } },
    update: {},
    create: {
      clientPAN: client.username,
      staffID: staff.username,
      assessmentYear: '2024-25',
      status: 'Allocated',
      billingStatus: 'Pending',
      comments: 'Initial allocation for 2024-25',
    },
  });
  console.log({ allocation });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
