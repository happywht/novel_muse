import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver | null = null;

/**
 * Initializes the Neo4j driver using environment variables.
 */
export const initNeo4j = (): Driver => {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user) {
        throw new Error('Missing Neo4j connection configuration (NEO4J_URI, NEO4J_USER)');
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password || ''));
    console.log(`🔗 Neo4j connected to ${uri}`);
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
