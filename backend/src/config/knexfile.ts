import type { Knex } from 'knex';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { parse as parsePgConnectionString } from 'pg-connection-string';

// Determine which .env file to load based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(__dirname, `../../${envFile}`) });

// Construire un chemin absolu vers la racine du projet, puis vers le fichier de BDD
const projectRoot = path.resolve(__dirname, '../../');
const dbPath = path.join(projectRoot, 'data/dev.sqlite3');

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: dbPath,
    },
    useNullAsDefault: true, // Requis pour SQLite
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
    },
    seeds: {
      directory: path.resolve(__dirname, '../database/seeds'),
    },
  },
};

export default config;
