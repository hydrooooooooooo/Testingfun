import { Agent } from 'agno';
import { Ollama } from 'agno/models/ollama';
import * as fs from 'fs';
import * as path from 'path';

export interface AnalysisResult {
  priceAnalysis: {
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    undervaluedItems: any[];
  };
  opportunities: any[];
  locationTrends: any[];
  recommendations: string[];
  confidenceScores: { [key: string]: number };
}

export class MarketplaceAnalysisAgent {
  private agent: Agent;

  constructor() {
    this.agent = new Agent({
      model: new Ollama({ id: "llama3.1:8b" }), // ou le modèle que vous préférez
      instructions: [
        "Tu es un expert en analyse de marketplace Facebook",
        "Analyse les données scrapées pour détecter les opportunités commerciales",
        "Fournis des insights actionnables en français",
        "Sois précis et concret dans tes recommandations"
      ],
      markdown: true
    });
  }

  async analyzeScrapedData(csvData: any[], sessionId: string): Promise<AnalysisResult> {
    try {
      const analysisPrompt = `
      Analyse ce dataset de ${csvData.length} annonces Facebook Marketplace.
      
      Données d'exemple: ${JSON.stringify(csvData.slice(0, 3), null, 2)}
      
      Génère une analyse structurée avec:
      
      1. **Analyse des prix:**
         - Prix moyen, minimum, maximum
         - Identifie 3-5 articles sous-évalués (bon rapport qualité/prix)
      
      2. **Opportunités commerciales:**
         - Articles avec potentiel de revente
         - Produits en demande
      
      3. **Tendances géographiques:**
         - Différences de prix par localisation
      
      4. **Recommandations d'achat:**
         - Top 5 des meilleures affaires
         - Conseils de négociation
      
      5. **Score de confiance (1-10) pour chaque annonce**
      
      Réponds UNIQUEMENT en format JSON valide, sans markdown ni texte supplémentaire:
      {
        "priceAnalysis": {
          "averagePrice": number,
          "minPrice": number,
          "maxPrice": number,
          "undervaluedItems": [...]
        },
        "opportunities": [...],
        "locationTrends": [...],
        "recommendations": [...],
        "confidenceScores": {...}
      }
      `;

      const response = await this.agent.run(analysisPrompt);
      
      // Parse la réponse JSON
      let analysisResult: AnalysisResult;
      try {
        analysisResult = JSON.parse(response.content);
      } catch (parseError) {
        // Fallback si le parsing échoue
        analysisResult = {
          priceAnalysis: {
            averagePrice: 0,
            minPrice: 0,
            maxPrice: 0,
            undervaluedItems: []
          },
          opportunities: [],
          locationTrends: [],
          recommendations: ["Analyse en cours, veuillez réessayer"],
          confidenceScores: {}
        };
      }

      return analysisResult;
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
      throw error;
    }
  }
}
