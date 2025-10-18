import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    console.log('=== Users in Database ===');
    console.log(`Found ${users.length} user(s):\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Created: ${user.createdAt.toISOString()}\n`);
    });

    if (users.length === 0) {
      console.log('No users found. You can register a user through the API:\n');
      console.log('POST http://localhost:4000/api/auth/register');
      console.log('Body: { "email": "test@example.com", "password": "password123", "name": "Test User" }');
    }
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
