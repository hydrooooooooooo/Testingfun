import ExcelJS from 'exceljs';
import { logger } from '../utils/logger';
import { apifyService } from './apifyService';
import { PLANS } from '../config/plans';

export class ExportService {
  /**
   * Générer des données de démonstration pour les exports
   */
  private generateDemoData(packId: string): any[] {
    // Déterminer le nombre d'éléments en fonction du pack
    const pack = PLANS.find(p => p.id === packId) || PLANS[0];
    const nbItems = pack.nbDownloads || 50;
    
    // Générer des données de démonstration
    const demoItems = [];
    
    for (let i = 1; i <= nbItems; i++) {
      demoItems.push({
        title: `Annonce démonstration #${i} - ${pack.name}`,
        price: `${Math.floor(Math.random() * 1000) + 100} €`,
        desc: `Ceci est une description de démonstration pour l'annonce #${i}. Ce fichier est généré pour montrer le format des données exportées.`,
        location: ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Lille'][Math.floor(Math.random() * 5)],
        url: `https://example.com/annonce-${i}`,
        postedAt: new Date().toISOString().split('T')[0],
        image: `https://example.com/images/demo-${i}.jpg`
      });
    }
    
    return demoItems;
  }
  
  /**
   * Générer un fichier Excel de démonstration
   */
  async generateDemoExcel(packId: string): Promise<Buffer> {
    try {
      // Générer des données de démonstration
      const demoItems = this.generateDemoData(packId);
      
      // Créer un nouveau classeur Excel
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Marketplace Scraper Pro';
      workbook.lastModifiedBy = 'Marketplace Scraper Pro';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // Ajouter une feuille de calcul
      const worksheet = workbook.addWorksheet('Données de démonstration');
      
      // Ajouter les en-têtes
      worksheet.columns = [
        { header: 'Titre', key: 'title', width: 30 },
        { header: 'Prix', key: 'price', width: 15 },
        { header: 'Description', key: 'desc', width: 50 },
        { header: 'Ville', key: 'location', width: 20 },
        { header: 'URL', key: 'url', width: 30 },
        { header: 'Date de publication', key: 'postedAt', width: 20 },
        { header: 'Image URL', key: 'image', width: 30 }
      ];
      
      // Ajouter les lignes
      worksheet.addRows(demoItems);
      
      // Styliser la ligne d'en-tête
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      
      // Générer le buffer
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      
      logger.info(`Généré un fichier Excel de démonstration avec ${demoItems.length} éléments pour le pack ${packId}`);
      return buffer;
    } catch (error) {
      logger.error(`Erreur lors de la génération du fichier Excel de démonstration:`, error);
      throw new Error(`Échec de la génération du fichier Excel de démonstration: ${(error as Error).message}`);
    }
  }
  
  /**
   * Générer un fichier CSV de démonstration
   */
  async generateDemoCSV(packId: string): Promise<Buffer> {
    try {
      // Générer des données de démonstration
      const demoItems = this.generateDemoData(packId);
      
      // Créer l'en-tête CSV
      let csv = 'Titre;Prix;Description;Ville;URL;Date de publication;Image URL\n';
      
      // Ajouter les lignes
      demoItems.forEach(item => {
        // Échapper les points-virgules dans les champs
        const escapedTitle = (item.title || '').replace(/;/g, ',');
        const escapedDesc = (item.desc || '').replace(/;/g, ',');
        const escapedLocation = (item.location || '').replace(/;/g, ',');
        
        csv += `${escapedTitle};${item.price || ''};${escapedDesc};${escapedLocation};${item.url || ''};${item.postedAt || ''};${item.image || ''}\n`;
      });
      
      logger.info(`Généré un fichier CSV de démonstration avec ${demoItems.length} éléments pour le pack ${packId}`);
      return Buffer.from(csv, 'utf-8');
    } catch (error) {
      logger.error(`Erreur lors de la génération du fichier CSV de démonstration:`, error);
      throw new Error(`Échec de la génération du fichier CSV de démonstration: ${(error as Error).message}`);
    }
  }
  
  /**
   * Generate an Excel file from scraped data
   */
  async generateExcel(datasetId: string, packId: string): Promise<Buffer> {
    try {
      // Find the pack to determine how many items to include
      const pack = PLANS.find(p => p.id === packId);
      if (!pack) {
        throw new Error(`Pack with ID ${packId} not found`);
      }

      // Get items from APIFY dataset
      const items = await apifyService.getAllItems(datasetId);
      
      // Limit items based on the pack's nbDownloads
      const limitedItems = items.slice(0, pack.nbDownloads);
      
      // Create a new Excel workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Marketplace Scraper Pro';
      workbook.lastModifiedBy = 'Marketplace Scraper Pro';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // Add a worksheet
      const worksheet = workbook.addWorksheet('Marketplace Data');
      
      // Add headers
      worksheet.columns = [
        { header: 'Titre', key: 'title', width: 30 },
        { header: 'Prix', key: 'price', width: 15 },
        { header: 'Description', key: 'desc', width: 50 },
        { header: 'Ville', key: 'location', width: 20 },
        { header: 'URL', key: 'url', width: 30 },
        { header: 'Date de publication', key: 'postedAt', width: 20 },
        { header: 'Image URL', key: 'image', width: 30 }
      ];
      
      // Add rows
      worksheet.addRows(limitedItems);
      
      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      
      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      
      logger.info(`Generated Excel file with ${limitedItems.length} items for dataset ${datasetId}`);
      return buffer;
    } catch (error) {
      logger.error(`Error generating Excel file for dataset ${datasetId}:`, error);
      throw new Error(`Failed to generate Excel file: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a CSV file from scraped data
   */
  async generateCSV(datasetId: string, packId: string): Promise<Buffer> {
    try {
      // Find the pack to determine how many items to include
      const pack = PLANS.find(p => p.id === packId);
      if (!pack) {
        throw new Error(`Pack with ID ${packId} not found`);
      }

      // Get items from APIFY dataset
      const items = await apifyService.getAllItems(datasetId);
      
      // Limit items based on the pack's nbDownloads
      const limitedItems = items.slice(0, pack.nbDownloads);
      
      // Create CSV header
      let csv = 'Titre;Prix;Description;Ville;URL;Date de publication;Image URL\n';
      
      // Add rows
      limitedItems.forEach(item => {
        // Escape semicolons in fields
        const escapedTitle = (item.title || '').replace(/;/g, ',');
        const escapedDesc = (item.desc || '').replace(/;/g, ',');
        const escapedLocation = (item.location || '').replace(/;/g, ',');
        
        csv += `${escapedTitle};${item.price || ''};${escapedDesc};${escapedLocation};${item.url || ''};${item.postedAt || ''};${item.image || ''}\n`;
      });
      
      logger.info(`Generated CSV file with ${limitedItems.length} items for dataset ${datasetId}`);
      return Buffer.from(csv, 'utf-8');
    } catch (error) {
      logger.error(`Error generating CSV file for dataset ${datasetId}:`, error);
      throw new Error(`Failed to generate CSV file: ${(error as Error).message}`);
    }
  }
}

export const exportService = new ExportService();
