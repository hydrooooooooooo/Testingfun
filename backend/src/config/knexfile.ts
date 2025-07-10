import type { Knex } from 'knex';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file at the root of backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Necessary for services like Heroku
    },
    migrations: {
      directory: path.resolve(__dirname, '../database/migrations')
    },
    seeds: {
      directory: path.resolve(__dirname, '../database/seeds')
    }
  }
};

export default config;
