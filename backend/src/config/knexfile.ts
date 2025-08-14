import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
import { parse as parsePgConnectionString } from 'pg-connection-string';
import * as path from 'path';

// Determine which .env file to load based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(__dirname, `../../${envFile}`) });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: () => {
      // Utiliser DEV_DATABASE_URL en priorité, sinon DATABASE_URL
      const connectionString = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL || '';
      const parsed = parsePgConnectionString(connectionString);

      const connectionConfig: Knex.PgConnectionConfig = {
        host: parsed.host ?? undefined,
        port: parsed.port ? parseInt(parsed.port, 10) : undefined,
        user: parsed.user ?? undefined,
        password: parsed.password ?? undefined,
        database: parsed.database ?? undefined,
      };

      // SSL désactivé pour localhost, activé (relâché) pour hôtes distants
      if (connectionConfig.host === 'localhost' || connectionConfig.host === '127.0.0.1') {
        connectionConfig.ssl = false;
      } else {
        connectionConfig.ssl = { rejectUnauthorized: false } as any;
      }

      return connectionConfig;
    },
    migrations: {
      directory: path.join(__dirname, '../database/migrations'),
      tableName: 'knex_migrations',
      loadExtensions: ['.ts']
    },
    seeds: {
      directory: path.join(__dirname, '../database/seeds'),
    },
  },

  production: {
    client: 'pg',
    connection: () => {
      const connectionString = process.env.DATABASE_URL || '';
      const parsed = parsePgConnectionString(connectionString);

      const connectionConfig: Knex.PgConnectionConfig = {
        host: parsed.host ?? undefined,
        port: parsed.port ? parseInt(parsed.port, 10) : undefined,
        user: parsed.user ?? undefined,
        password: parsed.password ?? undefined,
        database: parsed.database ?? undefined,
      };

      if (connectionConfig.host === 'localhost' || connectionConfig.host === '127.0.0.1') {
        connectionConfig.ssl = false;
      } else {
        connectionConfig.ssl = { rejectUnauthorized: false };
      }
      
      return connectionConfig;
    },
    migrations: {
      directory: path.resolve(__dirname, '../database/migrations'),
      tableName: 'knex_migrations',
      loadExtensions: ['.ts']
    },
    seeds: {
      directory: path.resolve(__dirname, '../database/seeds'),
    },
  },
};

export default config;

