const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME, COLUMN_TYPE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'tool_affiliate'
      AND TABLE_NAME IN ('tts_scripts', 'IngredientProject', 'videoVeo3', 'imageVeo3', 'Character')
      AND COLUMN_NAME = 'id';
  `;
  console.log(result);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
