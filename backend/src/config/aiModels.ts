/**
 * =============================================================================
 * CONFIGURATION DES MODÈLES IA - SOURCE UNIQUE DE VÉRITÉ
 * =============================================================================
 * Définit les modèles IA disponibles et leurs multiplicateurs de coût.
 * Les coûts sont basés sur les prix réels d'OpenRouter.
 * =============================================================================
 */

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  costMultiplier: number; // Multiplicateur appliqué aux coûts de base COST_MATRIX
  contextWindow: number;
  recommended?: boolean;
  default?: boolean;
}

/**
 * Modèles IA disponibles avec leurs multiplicateurs de coût
 * 
 * IDs OpenRouter actuels (vérifiés sur openrouter.ai):
 * - google/gemini-2.5-flash (remplace gemini-2.0-flash)
 * - openai/gpt-4o-mini
 * - google/gemini-2.5-pro (remplace gemini-1.5-pro)
 * - openai/gpt-4o
 * - anthropic/claude-3.5-sonnet
 * 
 * Multiplicateurs basés sur le ratio de prix par rapport à Gemini Flash (base 1x)
 */
export const AI_MODELS: AIModel[] = [
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    description: 'Rapide et économique. Idéal pour les analyses courantes.',
    costMultiplier: 1.0, // Base de référence
    contextWindow: 1000000,
    recommended: true,
    default: true,
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Bon équilibre qualité/prix. Analyses précises.',
    costMultiplier: 1.5, // 1.5x le coût de base
    contextWindow: 128000,
    recommended: false,
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    description: 'Analyses approfondies avec grand contexte.',
    costMultiplier: 3.0, // 3x le coût de base
    contextWindow: 2000000,
    recommended: false,
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Haute qualité. Pour analyses complexes.',
    costMultiplier: 5.0, // 5x le coût de base
    contextWindow: 128000,
    recommended: false,
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Premium. Analyses les plus détaillées et nuancées.',
    costMultiplier: 8.0, // 8x le coût de base (Claude est cher)
    contextWindow: 200000,
    recommended: false,
  },
];

/**
 * Obtenir un modèle par son ID
 */
export function getAIModel(modelId: string): AIModel | undefined {
  return AI_MODELS.find(m => m.id === modelId);
}

/**
 * Obtenir le modèle par défaut
 */
export function getDefaultAIModel(): AIModel {
  return AI_MODELS.find(m => m.default) || AI_MODELS[0];
}

/**
 * Obtenir le multiplicateur de coût pour un modèle
 * Retourne 1.0 si le modèle n'est pas trouvé (fallback sur le défaut)
 */
export function getModelCostMultiplier(modelId: string): number {
  const model = getAIModel(modelId);
  return model?.costMultiplier || 1.0;
}

/**
 * Valider qu'un ID de modèle est valide
 */
export function isValidModelId(modelId: string): boolean {
  return AI_MODELS.some(m => m.id === modelId);
}

/**
 * Obtenir la liste des modèles pour l'API (sans infos sensibles)
 */
export function getModelsForAPI(): Omit<AIModel, 'contextWindow'>[] {
  return AI_MODELS.map(({ contextWindow, ...rest }) => rest);
}
