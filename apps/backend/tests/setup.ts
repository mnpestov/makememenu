import { beforeAll, afterAll } from 'vitest';
import prisma from '../src/db/prismaClient';

beforeAll(async () => {
  // Do not wipe dev database
});

afterAll(async () => {
  await prisma.$disconnect();
});
