import ExcelJS from 'exceljs';
import axios from 'axios';
import { logger } from '../utils/logger';
import { apifyService } from './apifyService';
import { PLANS } from '../config/plans';

export class ExportService {
  
  /**
   * Télécharger une image depuis une URL et la convertir en buffer
   */
  private async downloadImage(imageUrl: string): Promise<Buffer | null> {
    try {
      if (!imageUrl || typeof imageUrl !== 'string') {
        return null;
      }

      // Timeout de 10 secondes pour éviter les blocages
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.status === 200 && response.data) {
        return Buffer.from(response.data);
      }
    } catch (error) {
      logger.warn(`Impossible de télécharger l'image ${imageUrl}: ${error}`);
    }
    return null;
  }

  /**
   * Extraire l'URL d'image à partir des données Apify
   */
  private extractImageUrl(item: any): string | null {
    // Ordre de priorité pour extraire l'URL d'image
    const imageFields = [
      'imageUrl',
      'image',
      'img',
      'thumbnail',
      'primary_listing_photo.listing_image.uri',
      'primary_listing_photo.image.uri',
      'listing_photos.0.image.uri'
    ];

    for (const field of imageFields) {
      let value = item;
      const fieldPath = field.split('.');
      
      for (const part of fieldPath) {
        if (value && typeof value === 'object') {
          value = value[part];
        } else {
          value = null;
          break;
        }
      }

      if (value && typeof value === 'string' && value.startsWith('http')) {
        return value;
      }
    }

    return null;
  }

  /**
   * Map already-normalized items from apifyService to export format.
   * apifyService.extractItemData() is the single source of truth for normalization.
   */
  private normalizeItem(item: any): any {
    return {
      title: item.title || 'Sans titre',
      price: item.price || 'Prix non spécifié',
      description: item.desc || item.description || 'Description non disponible',
      location: typeof item.location === 'string' ? item.location : 'Localisation non spécifiée',
      url: item.url || '',
      postedAt: item.postedAt || new Date().toISOString().split('T')[0],
      imageUrl: item.image || (Array.isArray(item.images) ? item.images[0] : null) || this.extractImageUrl(item),
      rawData: item
    };
  }

  /**
   * Générer un fichier Excel corporate enrichi avec images
   */
  async generateEnhancedExcel(datasetId: string, packId: string): Promise<Buffer> {
    try {
      logger.info(`Génération d'un Excel enrichi pour dataset ${datasetId} et pack ${packId}`);

      // Récupérer les données du dataset
      const rawItems = await apifyService.getDatasetItems(datasetId);
      if (!rawItems || rawItems.length === 0) {
        throw new Error('Aucune donnée trouvée dans le dataset');
      }

      // Normaliser les données
      const items = rawItems.map(item => this.normalizeItem(item));
      const pack = PLANS.find(p => p.id === packId) || PLANS[0];
      const limitedItems = items.slice(0, pack.nbDownloads);

      logger.info(`${limitedItems.length} éléments à traiter pour le pack ${pack.name}`);

      // Créer le classeur Excel
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Marketplace Scraper Pro';
      workbook.created = new Date();
      workbook.modified = new Date();

      // === FEUILLE 1: DONNÉES AVEC IMAGES ===
      const worksheet = workbook.addWorksheet('Données avec Images');
      
      // Configuration de la feuille
      worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      };

      // En-tête corporate moderne
      worksheet.mergeCells('A1:F3');
      const headerCell = worksheet.getCell('A1');
      headerCell.value = `MARKETPLACE SCRAPER PRO\nRapport généré le ${new Date().toLocaleDateString('fr-FR')}\nNombre d'éléments: ${limitedItems.length}`;
      headerCell.font = { size: 16, bold: true, color: { argb: 'FF2563EB' } };
      headerCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      headerCell.border = {
        top: { style: 'thick', color: { argb: 'FF2563EB' } },
        bottom: { style: 'thick', color: { argb: 'FF2563EB' } },
        left: { style: 'thick', color: { argb: 'FF2563EB' } },
        right: { style: 'thick', color: { argb: 'FF2563EB' } }
      };

      // Ligne vide pour l'espacement
      worksheet.getRow(4).height = 10;

      // En-têtes des colonnes (ligne 5)
      const headers = ['IMAGE', 'TITRE', 'PRIX', 'DESCRIPTION', 'LOCALISATION', 'URL'];
      const headerRow = worksheet.getRow(5);
      
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF6B7280' } },
          bottom: { style: 'thin', color: { argb: 'FF6B7280' } },
          left: { style: 'thin', color: { argb: 'FF6B7280' } },
          right: { style: 'thin', color: { argb: 'FF6B7280' } }
        };
      });

      // Configuration des largeurs de colonnes
      worksheet.columns = [
        { width: 20 }, // Image
        { width: 35 }, // Titre
        { width: 15 }, // Prix
        { width: 50 }, // Description
        { width: 25 }, // Localisation
        { width: 30 }  // URL
      ];

      // Traitement des données avec images
      let currentRow = 6;
      
      for (let i = 0; i < limitedItems.length; i++) {
        const item = limitedItems[i];
        const row = worksheet.getRow(currentRow);
        
        // Définir la hauteur de ligne pour les images
        row.height = 120;

        // Télécharger et insérer l'image
        if (item.imageUrl) {
          try {
            const imageBuffer = await this.downloadImage(item.imageUrl);
            if (imageBuffer) {
              const imageId = workbook.addImage({
                buffer: imageBuffer as any,
                extension: 'jpeg'
              });

              worksheet.addImage(imageId, {
                tl: { col: 0, row: currentRow - 1 },
                ext: { width: 150, height: 110 }
              });
            }
          } catch (error) {
            logger.warn(`Erreur lors du téléchargement de l'image pour l'item ${i}: ${error}`);
            row.getCell(1).value = 'Image non disponible';
          }
        } else {
          row.getCell(1).value = 'Pas d\'image';
        }

        // Remplir les autres colonnes
        row.getCell(2).value = item.title;
        row.getCell(3).value = item.price;
        row.getCell(4).value = item.description;
        row.getCell(5).value = item.location;
        row.getCell(6).value = item.url;

        // Style moderne pour les cellules de données
        for (let col = 1; col <= 6; col++) {
          const cell = row.getCell(col);
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };

          // Couleur alternée pour les lignes
          if (i % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
          }
        }

        // Style spécial pour la colonne prix
        row.getCell(3).font = { bold: true, color: { argb: 'FF059669' } };
        
        // Hyperlien pour l'URL
        if (item.url) {
          row.getCell(6).value = {
            text: 'Voir l\'annonce',
            hyperlink: item.url
          };
          row.getCell(6).font = { color: { argb: 'FF2563EB' }, underline: true };
        }

        currentRow++;
        
        // Afficher la progression
        if (i % 10 === 0) {
          logger.info(`Traitement des images: ${i + 1}/${limitedItems.length}`);
        }
      }

      // === FEUILLE 2: TABLEAU RÉCAPITULATIF ===
      const summarySheet = workbook.addWorksheet('Tableau Récapitulatif');
      
      // En-tête du récapitulatif
      summarySheet.mergeCells('A1:D2');
      const summaryHeader = summarySheet.getCell('A1');
      summaryHeader.value = `TABLEAU RÉCAPITULATIF\nAnalyse des ${limitedItems.length} éléments`;
      summaryHeader.font = { size: 14, bold: true, color: { argb: 'FF1F2937' } };
      summaryHeader.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

      // Statistiques générales
      let summaryRow = 4;
      const stats = this.calculateStatistics(limitedItems);
      
      const statsData = [
        ['STATISTIQUES GÉNÉRALES', ''],
        ['Nombre total d\'éléments', limitedItems.length],
        ['Éléments avec image', limitedItems.filter(item => item.imageUrl).length],
        ['Prix moyen', stats.averagePrice],
        ['Prix minimum', stats.minPrice],
        ['Prix maximum', stats.maxPrice],
        ['', ''],
        ['RÉPARTITION PAR LOCALISATION', ''],
        ...Object.entries(stats.locationStats).map(([location, count]) => [location, count])
      ];

      statsData.forEach((row, index) => {
        const excelRow = summarySheet.getRow(summaryRow + index);
        excelRow.getCell(1).value = row[0];
        excelRow.getCell(2).value = row[1];
        
        if (typeof row[0] === 'string' && (row[0].includes('STATISTIQUES') || row[0].includes('RÉPARTITION'))) {
          excelRow.getCell(1).font = { bold: true, color: { argb: 'FF2563EB' } };
          excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
        }
      });

      // Configuration des colonnes du récapitulatif
      summarySheet.columns = [
        { width: 30 },
        { width: 20 }
      ];

      logger.info('Fichier Excel enrichi généré avec succès');
      const arrayBuf = await workbook.xlsx.writeBuffer();
      return Buffer.from(arrayBuf as ArrayBuffer);

    } catch (error) {
      logger.error('Erreur lors de la génération du fichier Excel enrichi:', error);
      throw new Error(`Échec de la génération du fichier Excel enrichi: ${error}`);
    }
  }

  /**
   * Calculer les statistiques des données
   */
  private calculateStatistics(items: any[]) {
    const prices = items
      .map(item => this.extractNumericPrice(item.price))
      .filter(price => price > 0);

    const locationStats: { [key: string]: number } = {};
    items.forEach(item => {
      const location = item.location || 'Non spécifié';
      locationStats[location] = (locationStats[location] || 0) + 1;
    });

    return {
      averagePrice: prices.length > 0 ? `${Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)} €` : 'N/A',
      minPrice: prices.length > 0 ? `${Math.min(...prices)} €` : 'N/A',
      maxPrice: prices.length > 0 ? `${Math.max(...prices)} €` : 'N/A',
      locationStats
    };
  }

  /**
   * Extraire le prix numérique d'une chaîne
   */
  private extractNumericPrice(priceString: string): number {
    if (!priceString) return 0;
    const match = priceString.match(/[\d\s]+/);
    if (match) {
      return parseInt(match[0].replace(/\s/g, ''), 10) || 0;
    }
    return 0;
  }

  /**
   * Méthode existante pour la compatibilité
   */
  async generateExcel(datasetId: string, packId: string): Promise<Buffer> {
    return this.generateEnhancedExcel(datasetId, packId);
  }

  /**
   * Générer des données de démonstration pour les exports
   */
  private generateDemoData(packId: string): any[] {
    const pack = PLANS.find(p => p.id === packId) || PLANS[0];
    const nbItems = pack.nbDownloads || 50;
    
    const demoItems = [];
    const sampleImages = [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400',
      'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=400',
      'https://images.unsplash.com/photo-1493663284031-b7e3aeca4618?w=400'
    ];
    
    for (let i = 1; i <= nbItems; i++) {
      demoItems.push({
        title: `Annonce démonstration #${i} - ${pack.name}`,
        price: `${Math.floor(Math.random() * 1000) + 100} €`,
        description: `Ceci est une description de démonstration pour l'annonce #${i}. Ce fichier est généré pour montrer le format des données exportées avec images intégrées.`,
        location: ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Lille'][Math.floor(Math.random() * 5)],
        url: `https://example.com/annonce-${i}`,
        postedAt: new Date().toISOString().split('T')[0],
        imageUrl: sampleImages[i % sampleImages.length]
      });
    }
    
    return demoItems;
  }

  /**
   * Générer un fichier Excel de démonstration enrichi
   */
  async generateDemoExcel(packId: string): Promise<Buffer> {
    try {
      const demoItems = this.generateDemoData(packId);
      
      // Utiliser la même logique que generateEnhancedExcel mais avec des données de démo
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Marketplace Scraper Pro - Version Démo';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Données de Démonstration');
      
      // En-tête
      worksheet.mergeCells('A1:F3');
      const headerCell = worksheet.getCell('A1');
      headerCell.value = `MARKETPLACE SCRAPER PRO - DÉMO\nRapport généré le ${new Date().toLocaleDateString('fr-FR')}\nNombre d'éléments: ${demoItems.length}`;
      headerCell.font = { size: 16, bold: true, color: { argb: 'FF2563EB' } };
      headerCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

      // En-têtes des colonnes
      const headers = ['IMAGE', 'TITRE', 'PRIX', 'DESCRIPTION', 'LOCALISATION', 'URL'];
      const headerRow = worksheet.getRow(5);
      
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      worksheet.columns = [
        { width: 20 }, { width: 35 }, { width: 15 }, 
        { width: 50 }, { width: 25 }, { width: 30 }
      ];

      // Ajouter les données sans télécharger les images (démo)
      demoItems.forEach((item, index) => {
        const row = worksheet.getRow(6 + index);
        row.height = 30;
        
        row.getCell(1).value = 'Image démo';
        row.getCell(2).value = item.title;
        row.getCell(3).value = item.price;
        row.getCell(4).value = item.description;
        row.getCell(5).value = item.location;
        row.getCell(6).value = item.url;

        // Style
        for (let col = 1; col <= 6; col++) {
          const cell = row.getCell(col);
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
          if (index % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
          }
        }
      });

      logger.info(`Généré un fichier Excel de démonstration avec ${demoItems.length} éléments`);
      const arrayBuf = await workbook.xlsx.writeBuffer();
      return Buffer.from(arrayBuf as ArrayBuffer);
    } catch (error) {
      logger.error('Erreur lors de la génération du fichier Excel de démonstration:', error);
      throw new Error(`Échec de la génération du fichier Excel de démonstration: ${error}`);
    }
  }

  /**
   * Générer un fichier CSV (méthode existante pour compatibilité)
   */
  async generateCSV(datasetId: string, packId: string): Promise<Buffer> {
    try {
      const rawItems = await apifyService.getDatasetItems(datasetId);
      if (!rawItems || rawItems.length === 0) {
        throw new Error('Aucune donnée trouvée dans le dataset');
      }

      const items = rawItems.map(item => this.normalizeItem(item));
      const pack = PLANS.find(p => p.id === packId) || PLANS[0];
      const limitedItems = items.slice(0, pack.nbDownloads);

      let csv = 'Titre;Prix;Description;Localisation;URL;Date;Image URL\n';
      
      limitedItems.forEach(item => {
        const escapedTitle = (item.title || '').replace(/;/g, ',');
        const escapedDesc = (item.description || '').replace(/;/g, ',');
        const escapedLocation = (item.location || '').replace(/;/g, ',');
        
        csv += `${escapedTitle};${item.price || ''};${escapedDesc};${escapedLocation};${item.url || ''};${item.postedAt || ''};${item.imageUrl || ''}\n`;
      });

      return Buffer.from(csv, 'utf-8');
    } catch (error) {
      logger.error('Erreur lors de la génération du fichier CSV:', error);
      throw new Error(`Échec de la génération du fichier CSV: ${error}`);
    }
  }

  /**
   * Générer un fichier CSV de démonstration
   */
  async generateDemoCSV(packId: string): Promise<Buffer> {
    try {
      const demoItems = this.generateDemoData(packId);
      
      let csv = 'Titre;Prix;Description;Localisation;URL;Date;Image URL\n';
      
      demoItems.forEach(item => {
        const escapedTitle = (item.title || '').replace(/;/g, ',');
        const escapedDesc = (item.description || '').replace(/;/g, ',');
        const escapedLocation = (item.location || '').replace(/;/g, ',');
        
        csv += `${escapedTitle};${item.price || ''};${escapedDesc};${escapedLocation};${item.url || ''};${item.postedAt || ''};${item.imageUrl || ''}\n`;
      });

      logger.info(`Généré un fichier CSV de démonstration avec ${demoItems.length} éléments`);
      return Buffer.from(csv, 'utf-8');
    } catch (error) {
      logger.error('Erreur lors de la génération du fichier CSV de démonstration:', error);
      throw new Error(`Échec de la génération du fichier CSV de démonstration: ${error}`);
    }
  }
}

export const exportService = new ExportService();