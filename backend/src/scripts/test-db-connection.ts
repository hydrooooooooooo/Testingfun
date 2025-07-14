import path from 'path';
import dotenv from 'dotenv';
import knex, { Knex } from 'knex';
import knexConfig from '../config/knexfile';

// Charger le fichier d'environnement de production
const envPath = path.resolve(__dirname, '../../.env.production');
dotenv.config({ path: envPath });

console.log('Tentative de connexion à la base de données avec la configuration de production...');
console.log(`Chargement des variables d'environnement depuis : ${envPath}`);

if (!process.env.DATABASE_URL) {
  console.error("\n❌ Erreur : La variable d'environnement DATABASE_URL n'a pas été trouvée dans votre fichier .env.production.");
  process.exit(1);
}

console.log('DATABASE_URL trouvée. Initialisation de la connexion...');

const testDbConnection = async () => {
  let knexInstance: Knex | null = null;
  try {
    // Utiliser la configuration de production de knexfile
    const config = knexConfig.production;
    knexInstance = knex(config);

    // Une requête simple pour vérifier la connexion
    await knexInstance.raw('SELECT 1');
    console.log("\n✅ Succès ! La connexion à la base de données a été établie avec succès.");
    process.exit(0); // Quitter avec un code de succès
  } catch (error) {
    console.error('\n❌ Erreur : Impossible de se connecter à la base de données.');
    console.error('Veuillez vérifier les points suivants :');
    console.error('  1. La base de données PostgreSQL est-elle bien démarrée ?');
    console.error('  2. Les identifiants (utilisateur, mot de passe, nom de la base) dans votre DATABASE_URL sont-ils corrects ?');
    console.error('  3. Le nom d\'hôte et le port sont-ils corrects (ex: localhost:5432) ?');
    console.error("\nDétails de l'erreur :", error);
    process.exit(1); // Quitter avec un code d'erreur
  } finally {
    if (knexInstance) {
      await knexInstance.destroy();
    }
  }
};

testDbConnection();
