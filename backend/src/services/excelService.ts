import * as XLSX from 'xlsx';
import { logger } from '../utils/logger';

interface ExcelItem {
  // Données de base
  id?: string;
  title?: string;
  price?: string;
  description?: string;
  location?: string;
  url?: string;
  postedAt?: string;
  
  // Images étendues
  imageUrl?: string;
  allImages?: string[];
  imageCount?: number;
  image1?: string;
  image2?: string;
  image3?: string;
  image4?: string;
  image5?: string;
  
  // Livraison et commerce
  deliveryTypes?: string[];
  deliveryTypesText?: string;
  isShippingOffered?: boolean;
  canCheckout?: boolean;
  messagingEnabled?: boolean;
  
  // Statut de l'annonce
  isLive?: boolean;
  isSold?: boolean;
  isPending?: boolean;
  isHidden?: boolean;
  condition?: string;
  
  // Catégorie
  category?: string;
  categoryId?: string;
  
  // Véhicule (si applicable)
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleCondition?: string;
  vehicleColor?: string;
  vehicleFuelType?: string;
  vehicleTransmission?: string;
  vehicleOdometer?: string;
  vehicleSellerType?: string;
  
  // Vendeur
  sellerPhone?: string;
  isViewerSeller?: boolean;
  badges?: string;
  
  // Métadonnées
  subtitles?: string;
  loggingId?: string;
  extractionDate?: string;
  
  [key: string]: any;
}

export class ExcelService {
  // Properties to track validation status
  public isValid: boolean = true;
  public errors: string[] = [];
  /**
   * Convertir les données Apify enrichies en format Excel
   */
  private convertToExcelFormat(items: any[]): ExcelItem[] {
    return items.map((item, index) => {
      // Préparer les images individuelles (jusqu'à 5)
      const imageFields: any = {};
      if (item.allImages && Array.isArray(item.allImages)) {
        for (let i = 0; i < Math.min(item.allImages.length, 5); i++) {
          imageFields[`image${i + 1}`] = item.allImages[i] || '';
        }
      }
      
      // Préparer les types de livraison en texte
      const deliveryTypesText = item.deliveryTypes && Array.isArray(item.deliveryTypes) 
        ? item.deliveryTypes.join(', ') 
        : '';
      
      // Préparer les données véhicule
      const vehicleData = item.vehicleData || {};
      
      // Préparer les sous-titres
      const subtitlesText = item.subtitles && Array.isArray(item.subtitles)
        ? item.subtitles.join(' | ')
        : '';
      
      // Préparer les badges
      const badgesText = item.badges && Array.isArray(item.badges)
        ? item.badges.map((badge: any) => badge.name || badge.type || 'Badge').join(', ')
        : (item.badgesSummary || '');

      const excelItem: ExcelItem = {
        // Données de base
        id: item.id || `item_${index + 1}`,
        title: item.title || 'Sans titre',
        price: item.price || '',
        description: this.cleanDescription(item.description || ''),
        location: item.location || '',
        url: item.url || '',
        postedAt: item.postedAt || '',
        
        // Images
        imageUrl: item.imageUrl || '',
        imageCount: item.imageCount || 0,
        ...imageFields,
        allImagesUrls: item.allImages && Array.isArray(item.allImages) 
          ? item.allImages.join(' | ') 
          : '',
        
        // Livraison et commerce
        deliveryTypes: deliveryTypesText,
        isShippingOffered: item.isShippingOffered ? 'Oui' : 'Non',
        canCheckout: item.canCheckout ? 'Oui' : 'Non',
        messagingEnabled: item.messagingEnabled ? 'Oui' : 'Non',
        
        // Statut
        isLive: item.isLive ? 'Oui' : 'Non',
        isSold: item.isSold ? 'Oui' : 'Non',
        isPending: item.isPending ? 'Oui' : 'Non',
        isHidden: item.isHidden ? 'Oui' : 'Non',
        condition: item.condition || '',
        
        // Catégorie
        category: item.category || '',
        categoryId: item.categoryId || '',
        
        // Données véhicule
        vehicleMake: vehicleData.vehicle_make_display_name || '',
        vehicleModel: vehicleData.vehicle_model_display_name || '',
        vehicleYear: vehicleData.vehicle_year || '',
        vehicleCondition: vehicleData.vehicle_condition || '',
        vehicleColor: vehicleData.vehicle_exterior_color || '',
        vehicleFuelType: vehicleData.vehicle_fuel_type || '',
        vehicleTransmission: vehicleData.vehicle_transmission_type || '',
        vehicleOdometer: vehicleData.vehicle_odometer_data?.value 
          ? `${vehicleData.vehicle_odometer_data.value} ${vehicleData.vehicle_odometer_data.unit || 'km'}`
          : '',
        vehicleSellerType: vehicleData.vehicle_seller_type || '',
        
        // Vendeur
        sellerPhone: item.sellerPhone || '',
        isViewerSeller: item.isViewerSeller ? 'Oui' : 'Non',
        badges: badgesText,
        
        // Métadonnées
        subtitles: subtitlesText,
        loggingId: item.logging_id || '',
        reportableId: item.reportable_ent_id || '',
        extractionDate: new Date().toLocaleDateString('fr-FR'),
        extractionTime: new Date().toLocaleTimeString('fr-FR')
      };
      
      return excelItem;
    });
  }

  /**
   * Nettoyer la description pour Excel
   */
  private cleanDescription(description: string): string {
    if (!description) return '';
    
    return description
      .replace(/\n/g, ' ')  // Remplacer les retours à la ligne
      .replace(/\t/g, ' ')  // Remplacer les tabulations
      .replace(/\s+/g, ' ') // Remplacer les espaces multiples
      .trim()
      .substring(0, 500); // Limiter à 500 caractères pour Excel
  }

  /**
   * Créer des en-têtes descriptifs pour Excel
   */
  private createHeaders(): { [key: string]: string } {
    return {
      id: 'ID Annonce',
      title: 'Titre',
      price: 'Prix',
      description: 'Description',
      location: 'Localisation',
      url: 'URL Annonce',
      postedAt: 'Date Publication',
      
      // Images
      imageUrl: 'Image Principale',
      imageCount: 'Nombre d\'Images',
      image1: 'Image 1',
      image2: 'Image 2', 
      image3: 'Image 3',
      image4: 'Image 4',
      image5: 'Image 5',
      allImagesUrls: 'Toutes les Images (URLs)',
      
      // Livraison
      deliveryTypes: 'Types de Livraison',
      isShippingOffered: 'Livraison Disponible',
      canCheckout: 'Achat Direct Possible',
      messagingEnabled: 'Messagerie Activée',
      
      // Statut
      isLive: 'Annonce Active',
      isSold: 'Vendu',
      isPending: 'En Attente',
      isHidden: 'Masqué',
      condition: 'État',
      
      // Catégorie
      category: 'Catégorie',
      categoryId: 'ID Catégorie',
      
      // Véhicule
      vehicleMake: 'Marque Véhicule',
      vehicleModel: 'Modèle Véhicule',
      vehicleYear: 'Année Véhicule',
      vehicleCondition: 'État Véhicule',
      vehicleColor: 'Couleur Véhicule',
      vehicleFuelType: 'Type Carburant',
      vehicleTransmission: 'Transmission',
      vehicleOdometer: 'Kilométrage',
      vehicleSellerType: 'Type Vendeur',
      
      // Vendeur
      sellerPhone: 'Téléphone Vendeur',
      isViewerSeller: 'Vendeur = Utilisateur',
      badges: 'Badges Vendeur',
      
      // Métadonnées
      subtitles: 'Sous-titres',
      loggingId: 'ID Log',
      reportableId: 'ID Rapport',
      extractionDate: 'Date Extraction',
      extractionTime: 'Heure Extraction'
    };
  }

  /**
   * Générer un fichier Excel avec toutes les données enrichies
   */
  async generateExcel(items: any[], filename: string = 'scraping_results'): Promise<Buffer> {
    try {
      logger.info(`Génération Excel pour ${items.length} items`);

      // Convertir les données au format Excel
      const excelData = this.convertToExcelFormat(items);
      
      if (excelData.length === 0) {
        throw new Error('Aucune donnée à exporter');
      }

      // Créer les en-têtes personnalisés
      const headers = this.createHeaders();
      
      // Réorganiser les données avec les en-têtes descriptifs
      const worksheetData = excelData.map(item => {
        const row: any = {};
        Object.keys(headers).forEach(key => {
          row[headers[key]] = item[key] || '';
        });
        return row;
      });

      // Créer le workbook
      const workbook = XLSX.utils.book_new();
      
      // Créer la feuille principale avec toutes les données
      const mainWorksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      // Ajuster la largeur des colonnes
      const columnWidths = [
        { wch: 15 }, // ID
        { wch: 30 }, // Titre
        { wch: 15 }, // Prix
        { wch: 50 }, // Description
        { wch: 20 }, // Localisation
        { wch: 40 }, // URL
        { wch: 15 }, // Date
        { wch: 40 }, // Image principale
        { wch: 10 }, // Nombre images
        { wch: 40 }, // Image 1
        { wch: 40 }, // Image 2
        { wch: 40 }, // Image 3
        { wch: 40 }, // Image 4
        { wch: 40 }, // Image 5
        { wch: 60 }, // Toutes images
        { wch: 20 }, // Types livraison
        { wch: 15 }, // Livraison dispo
        { wch: 15 }, // Achat direct
        { wch: 15 }, // Messagerie
        { wch: 15 }, // Active
        { wch: 10 }, // Vendu
        { wch: 15 }, // En attente
        { wch: 10 }, // Masqué
        { wch: 15 }, // État
        { wch: 20 }, // Catégorie
        { wch: 15 }, // ID catégorie
        { wch: 15 }, // Marque
        { wch: 15 }, // Modèle
        { wch: 10 }, // Année
        { wch: 15 }, // État véhicule
        { wch: 15 }, // Couleur
        { wch: 15 }, // Carburant
        { wch: 15 }, // Transmission
        { wch: 15 }, // Kilométrage
        { wch: 15 }, // Type vendeur
        { wch: 20 }, // Téléphone
        { wch: 15 }, // Vendeur = user
        { wch: 25 }, // Badges
        { wch: 30 }, // Sous-titres
        { wch: 20 }, // ID Log
        { wch: 20 }, // ID Rapport
        { wch: 15 }, // Date extraction
        { wch: 15 }  // Heure extraction
      ];
      
      mainWorksheet['!cols'] = columnWidths;
      
      // Ajouter la feuille principale
      XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Données Complètes');
      
      // Créer une feuille résumé avec seulement les données essentielles
      const summaryData = excelData.map(item => ({
        'ID': item.id,
        'Titre': item.title,
        'Prix': item.price,
        'Localisation': item.location,
        'URL': item.url,
        'Images': item.imageCount,
        'Livraison': item.deliveryTypes,
        'État': item.condition,
        'Statut': item.isSold === true ? 'Vendu' : (item.isLive === true ? 'Actif' : 'Inactif'),
        'Catégorie': item.category,
        'Date': item.extractionDate
      }));
      
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      summaryWorksheet['!cols'] = [
        { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, 
        { wch: 40 }, { wch: 10 }, { wch: 20 }, { wch: 15 }, 
        { wch: 15 }, { wch: 20 }, { wch: 15 }
      ];
      
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Résumé');
      
      // Créer une feuille spéciale pour les images
      const imagesData = excelData
        .filter(item => item.imageCount && item.imageCount > 0)
        .map(item => ({
          'ID Annonce': item.id,
          'Titre': item.title,
          'Nombre Images': item.imageCount,
          'Image Principale': item.imageUrl,
          'Toutes les Images': item.allImagesUrls
        }));
      
      if (imagesData.length > 0) {
        const imagesWorksheet = XLSX.utils.json_to_sheet(imagesData);
        imagesWorksheet['!cols'] = [
          { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 50 }, { wch: 80 }
        ];
        XLSX.utils.book_append_sheet(workbook, imagesWorksheet, 'Images');
      }
      
      // Créer une feuille pour les véhicules si applicable
      const vehicleData = excelData
        .filter(item => item.vehicleMake || item.vehicleModel)
        .map(item => ({
          'ID Annonce': item.id,
          'Titre': item.title,
          'Marque': item.vehicleMake,
          'Modèle': item.vehicleModel,
          'Année': item.vehicleYear,
          'Couleur': item.vehicleColor,
          'Carburant': item.vehicleFuelType,
          'Transmission': item.vehicleTransmission,
          'Kilométrage': item.vehicleOdometer,
          'État': item.vehicleCondition,
          'Type Vendeur': item.vehicleSellerType,
          'Prix': item.price
        }));
      
      if (vehicleData.length > 0) {
        const vehicleWorksheet = XLSX.utils.json_to_sheet(vehicleData);
        vehicleWorksheet['!cols'] = [
          { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, 
          { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
          { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
        ];
        XLSX.utils.book_append_sheet(workbook, vehicleWorksheet, 'Véhicules');
      }
      
      // Créer une feuille de statistiques
      const stats = this.generateStats(excelData);
      const statsWorksheet = XLSX.utils.json_to_sheet([stats]);
      statsWorksheet['!cols'] = [{ wch: 30 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, statsWorksheet, 'Statistiques');

      // Générer le buffer Excel
      const buffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true 
      });

      logger.info(`Excel généré avec succès: ${buffer.length} bytes`);
      
      return buffer;
    } catch (error) {
      logger.error(`Erreur lors de la génération Excel: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        itemCount: items.length,
        filename,
        error: error instanceof Error ? error.stack : error
      });
      throw error;
    }
  }

  /**
   * Générer un fichier CSV avec les données enrichies
   */
  async generateCSV(items: any[], filename: string = 'scraping_results'): Promise<Buffer> {
    try {
      logger.info(`Génération CSV pour ${items.length} éléments`);
      
      // Convertir les données au format Excel
      const excelData = this.convertToExcelFormat(items);
      
      // Valider les données
      const { isValid, errors } = this.validateData(items);
      this.isValid = isValid;
      this.errors = errors;
      
      if (!isValid && errors.length > 0) {
        logger.warn(`Avertissements lors de la génération CSV: ${errors.join(', ')}`);
      }
      
      // Créer les en-têtes
      const headers = this.createHeaders();
      
      // Préparer les lignes CSV
      const csvRows = [];
      
      // Ajouter la ligne d'en-tête
      csvRows.push(Object.values(headers).join(','));
      
      // Ajouter les lignes de données
      for (const item of excelData) {
        const row = [];
        for (const key of Object.keys(headers)) {
          // Échapper les valeurs contenant des virgules ou des sauts de ligne
          let value = item[key] !== undefined ? String(item[key]) : '';
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          row.push(value);
        }
        csvRows.push(row.join(','));
      }
      
      // Joindre toutes les lignes avec des sauts de ligne
      const csvContent = csvRows.join('\n');
      
      logger.info(`CSV généré avec succès: ${csvContent.length} caractères`);
      
      return Buffer.from(csvContent, 'utf-8');
    } catch (error) {
      logger.error(`Erreur lors de la génération CSV: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        itemCount: items.length,
        filename,
        error: error instanceof Error ? error.stack : error
      });
      throw error;
    }
  }

  /**
   * Générer des statistiques sur les données
   */
  private generateStats(data: ExcelItem[]): any {
    const total = data.length;
    const withImages = data.filter(item => item.imageCount && item.imageCount > 0).length;
    const withMultipleImages = data.filter(item => item.imageCount && item.imageCount > 1).length;
    const withDelivery = data.filter(item => item.deliveryTypes && item.deliveryTypes.length > 0).length;
    const active = data.filter(item => item.isLive === true).length;
    const sold = data.filter(item => item.isSold === true).length;
    const vehicles = data.filter(item => item.vehicleMake || item.vehicleModel).length;
    const withPhone = data.filter(item => item.sellerPhone && item.sellerPhone.length > 0).length;
    
    return {
      'Statistique': 'Valeur',
      'Total annonces': total,
      'Avec images': withImages,
      'Avec plusieurs images': withMultipleImages,
      'Avec options livraison': withDelivery,
      'Annonces actives': active,
      'Annonces vendues': sold,
      'Véhicules': vehicles,
      'Avec téléphone vendeur': withPhone,
      'Taux d\'images (%)': total > 0 ? Math.round((withImages / total) * 100) : 0,
      'Images moyennes par annonce': total > 0 ? Math.round(data.reduce((sum, item) => sum + (item.imageCount || 0), 0) / total * 10) / 10 : 0
    };
  }

  /**
   * Valider les données avant export
   */
  validateData(items: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!Array.isArray(items)) {
      errors.push('Les données doivent être un tableau');
      return { isValid: false, errors };
    }
    
    if (items.length === 0) {
      errors.push('Aucune donnée à exporter');
      return { isValid: false, errors };
    }
    
    // Vérifier que les items ont au minimum un titre ou un ID
    const itemsWithoutIdentifier = items.filter(item => 
      (!item.title || item.title.trim() === '') && 
      (!item.id || item.id.trim() === '')
    );
    
    if (itemsWithoutIdentifier.length > 0) {
      errors.push(`${itemsWithoutIdentifier.length} éléments sans titre ni ID détectés`);
    }
    
    // Avertir si beaucoup d'éléments n'ont pas d'images
    const itemsWithoutImages = items.filter(item => 
      !item.imageUrl && (!item.allImages || item.allImages.length === 0)
    );
    
    if (itemsWithoutImages.length > items.length * 0.5) {
      errors.push(`Plus de 50% des éléments n'ont pas d'images (${itemsWithoutImages.length}/${items.length})`);
    }
    
    logger.info('Validation des données pour export Excel', {
      totalItems: items.length,
      errorsCount: errors.length,
      errors
    });
    
    return { 
      isValid: errors.length === 0, 
      errors 
    };
  }
}

// Export an instance of the ExcelService class
export const excelService = new ExcelService();