import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBatchOperationDB() {
    console.log('Testing BatchOperation database operations...\n');

    try {
        // 1. 创建测试项目
        const testProject = await prisma.project.create({
            data: {
                title: 'Test Project for Batch Operations',
                premise: 'Test premise'
            }
        });
        console.log('Created test project:', testProject.id);

        // 2. 创建测试 Echo
        const testEcho1 = await prisma.echo.create({
            data: {
                projectId: testProject.id,
                type: 'TEST',
                targetId: 'test-1',
                targetName: 'Test Echo 1',
                description: 'Test description',
                reason: 'Test reason',
                status: 'PENDING',
                timestamp: BigInt(Date.now())
            }
        });
        const testEcho2 = await prisma.echo.create({
            data: {
                projectId: testProject.id,
                type: 'TEST',
                targetId: 'test-2',
                targetName: 'Test Echo 2',
                description: 'Test description',
                reason: 'Test reason',
                status: 'PENDING',
                timestamp: BigInt(Date.now())
            }
        });
        console.log('Created test echoes:', testEcho1.id, testEcho2.id);

        // 3. 创建批量操作记录
        const batchOp = await prisma.batchOperation.create({
            data: {
                projectId: testProject.id,
                operation: 'BATCH_ACCEPT',
                echoIds: JSON.stringify([testEcho1.id, testEcho2.id]),
                previousStates: JSON.stringify({
                    [testEcho1.id]: 'PENDING',
                    [testEcho2.id]: 'PENDING'
                }),
                timestamp: BigInt(Date.now()),
                expiresAt: BigInt(Date.now() + 5 * 60 * 1000)
            }
        });
        console.log('Created batch operation:', batchOp.id);

        // 4. 查询批量操作历史
        const history = await prisma.batchOperation.findMany({
            where: {
                projectId: testProject.id,
                timestamp: { gte: BigInt(Date.now() - 5 * 60 * 1000) }
            },
            orderBy: { timestamp: 'desc' }
        });
        console.log('Batch operation history:', history.length, 'records');

        // 5. 测试过期清理逻辑
        const expiredOp = await prisma.batchOperation.create({
            data: {
                projectId: testProject.id,
                operation: 'BATCH_REJECT',
                echoIds: JSON.stringify([testEcho1.id]),
                previousStates: JSON.stringify({ [testEcho1.id]: 'PENDING' }),
                timestamp: BigInt(Date.now() - 10 * 60 * 1000), // 10分钟前
                expiresAt: BigInt(Date.now() - 5 * 60 * 1000) // 已过期
            }
        });
        console.log('Created expired batch operation:', expiredOp.id);

        // 6. 清理过期记录
        const cleanupResult = await prisma.batchOperation.deleteMany({
            where: {
                expiresAt: { lt: BigInt(Date.now()) }
            }
        });
        console.log('Cleaned up', cleanupResult.count, 'expired operations');

        // 7. 验证清理结果
        const remainingOps = await prisma.batchOperation.findMany({
            where: { projectId: testProject.id }
        });
        console.log('Remaining operations:', remainingOps.length);

        // 8. 测试撤销操作（删除指定记录）
        await prisma.batchOperation.delete({
            where: { id: batchOp.id }
        });
        console.log('Deleted batch operation:', batchOp.id);

        // 9. 清理测试数据
        await prisma.echo.deleteMany({ where: { projectId: testProject.id } });
        await prisma.project.delete({ where: { id: testProject.id } });
        console.log('Cleaned up test data');

        console.log('\nAll tests passed!');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testBatchOperationDB();
