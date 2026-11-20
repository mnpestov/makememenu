import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import prisma from '../db/prismaClient';
import { switchRecipeCatalog } from '../services/catalogCutover';

async function main() {
  const { values } = parseArgs({ options: { apply: { type: 'boolean' }, povarenok: { type: 'string' } } });
  const povarenok = values.povarenok
    ? JSON.parse(await readFile(values.povarenok, 'utf8')) as unknown
    : undefined;
  const result = await switchRecipeCatalog({ apply: values.apply === true, povarenok });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(error => { console.error('Переключение каталога не выполнено:', error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
