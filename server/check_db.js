const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const projects = await prisma.project.findMany({
        include: {
            _count: {
                select: { characters: true, worldSettings: true, chapters: true, plotNodes: true }
            }
        }
    });

    console.log("PROJECTS IN DB:");
    console.dir(projects, { depth: null });

    for (const p of projects) {
        console.log(`\nProject: ${p.id} - ${p.title}`);
        console.log(`Characters: ${p._count.characters}`);
        console.log(`WorldSettings: ${p._count.worldSettings}`);
        console.log(`Chapters: ${p._count.chapters}`);
        console.log(`PlotNodes: ${p._count.plotNodes}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
