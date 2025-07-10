import knex from 'knex';
import knexConfig from '../config/knexfile';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const environment = config.server.env || 'development';
const dbConfig = knexConfig[environment];

if (!dbConfig) {
  throw new Error(`Missing Knex configuration for environment: ${environment}`);
}

const db = knex(dbConfig);

// Test the database connection on startup
db.raw('SELECT 1+1 AS result').catch((err) => {
  logger.error('Database connection failed. Please check your DATABASE_URL.', err);
  process.exit(1);
});

logger.info('Database connection configured.');

export default db;
