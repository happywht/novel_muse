import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver | null = null;

/**
 * 创建 Neo4j 性能优化索引
 * 这些索引显著提升图谱查询性能，特别是在多项目场景下
 */
async function createIndexes(driver: Driver): Promise<void> {
    const session = driver.session();

    const indexes = [
        // 注意：Neo4j 4.x 不支持不带标签的通用索引
        // 已通过各节点类型的专用索引覆盖查询需求

        // 角色名称索引（用于角色名称搜索和查重）
        {
            name: 'character_name',
            query: `CREATE INDEX character_name IF NOT EXISTS FOR (c:Character) ON (c.projectId, c.name)`,
            description: 'Character: projectId, name',
        },

        // Echo 状态索引（用于按状态筛选 Echo 节点）
        {
            name: 'echo_status',
            query: `CREATE INDEX echo_status IF NOT EXISTS FOR (e:Echo) ON (e.projectId, e.status)`,
            description: 'Echo: projectId, status',
        },

        // 情节节点顺序索引（用于按顺序获取情节线）
        {
            name: 'plot_node_order',
            query: `CREATE INDEX plot_node_order IF NOT EXISTS FOR (p:PlotNode) ON (p.projectId, p.order)`,
            description: 'PlotNode: projectId, order',
        },

        // 章节顺序索引（用于按顺序获取章节）
        {
            name: 'chapter_order',
            query: `CREATE INDEX chapter_order IF NOT EXISTS FOR (ch:Chapter) ON (ch.projectId, ch.order)`,
            description: 'Chapter: projectId, order',
        },

        // 世界设定类别索引（用于按类别筛选世界设定）
        {
            name: 'world_setting_category',
            query: `CREATE INDEX world_setting_category IF NOT EXISTS FOR (w:WorldSetting) ON (w.projectId, w.category)`,
            description: 'WorldSetting: projectId, category',
        },
    ];

    console.log('[Neo4j] Creating performance indexes...');

    for (const index of indexes) {
        try {
            await session.run(index.query);
            console.log(`[Neo4j] Index created: ${index.description}`);
        } catch (err: any) {
            // 索引已存在或其他错误
            if (err.message.includes('already exists')) {
                console.log(`[Neo4j] Index already exists: ${index.name}`);
            } else {
                console.warn(`[Neo4j] Index creation warning for ${index.name}:`, err.message);
            }
        }
    }

    await session.close();
    console.log('[Neo4j] Index creation completed');
}

/**
 * Initializes the Neo4j driver using environment variables.
 * 创建连接后会自动创建性能优化索引
 */
export const initNeo4j = async (): Promise<Driver> => {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user) {
        throw new Error('Missing Neo4j connection configuration (NEO4J_URI, NEO4J_USER)');
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password || ''));
    console.log(`🔗 Neo4j connected to ${uri}`);

    // 创建性能索引
    await createIndexes(driver);

    return driver;
};

/**
 * Returns the currently initialized driver or throws if not initialized.
 */
export const getDriver = (): Driver => {
    if (!driver) throw new Error('Neo4j driver not initialized');
    return driver;
};

/**
 * Closes the Neo4j driver connection.
 */
export const closeNeo4j = async () => {
    if (driver) {
        await driver.close();
        driver = null;
    }
};
