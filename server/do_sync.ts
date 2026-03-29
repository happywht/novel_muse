require('dotenv').config({ path: __dirname + '/.env' });
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'dummy';
import { syncProjectToGraph } from './src/services/graph/sync.ts';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  console.log('Fetching project...');
  const p = await prisma.project.findUnique({
    where: { id: '1771946061753' },
    include: {
      characters: true,
      worldSettings: true,
      timeline: true,
      echoes: true,
      chapters: true,
      plotNodes: true,
    },
  });
  if (p) {
    console.log('Syncing to Neo4j...');
    await syncProjectToGraph(p);
    console.log('Sync done');
  } else console.log('Project not found');
  await prisma.$disconnect();
  process.exit(0);
}
run();
