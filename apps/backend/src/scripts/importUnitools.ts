import prisma from '../db/prismaClient';
import { importUnitools } from '../services/recipeImportService';

importUnitools()
  .then(result => { console.log(JSON.stringify(result)); })
  .catch(error => { console.error('Импорт UniTools не выполнен:', error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
