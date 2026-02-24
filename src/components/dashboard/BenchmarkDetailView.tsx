import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, TrendingUp, AlertTriangle, Target, Zap, Lightbulb, CheckCircle } from 'lucide-react';

interface BenchmarkDetailViewProps {
  pageName: string;
  benchmarkData: any;
  onBack: () => void;
  onExportPDF: () => void;
}

const BenchmarkDetailView: React.FC<BenchmarkDetailViewProps> = ({ pageName, benchmarkData, onBack, onExportPDF }) => {
  // Parser les données du benchmark
  const parseBenchmarkData = () => {
    try {
      if (typeof benchmarkData.raw === 'string') {
        return JSON.parse(benchmarkData.raw);
      }
      return benchmarkData.raw || benchmarkData;
    } catch (error) {
      console.error('Error parsing benchmark data:', error);
      return null;
    }
  };

  const data = parseBenchmarkData();

  if (!data) {
    return (
      <div className="p-6 bg-cream-50">
        <Button onClick={onBack} variant="ghost" className="mb-4 text-steel-200 hover:text-navy">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux sessions
        </Button>
        <Card className="bg-white border-cream-300">
          <CardContent className="p-6">
            <p className="text-steel-200">Impossible de charger les données de benchmark</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mapper la structure de l'IA vers les champs attendus
  // Support des deux formats possibles: ancien (competitive_positioning) et nouveau (benchmark_positioning)
  const globalScore = data.benchmark_positioning?.overall_score || data.competitive_positioning?.overall_score || 0;
  const position = {
    sector: data.benchmark_positioning?.position || data.competitive_positioning?.sector_position || 'Dans la moyenne',
    category: data.meta?.sector_detected || data.meta?.detected_sector?.primary || 'Secteur',
    categoryName: data.meta?.sector_detected || data.competitive_positioning?.industry || 'Non détecté'
  };
  
  // Support des deux formats: metrics_comparison (nouveau) et sector_benchmarks (ancien)
  const metricsComparison = data.metrics_comparison || {};
  const sectorBenchmarks = data.sector_benchmarks || {};
  
  const benchmarks = {
    // Nouveau format: metrics_comparison.likes.page_average
    likes: metricsComparison.likes?.page_average || sectorBenchmarks.page_metrics?.likes || 0,
    likesBenchmark: metricsComparison.likes?.sector_benchmark || sectorBenchmarks.industry_averages?.likes || 0,
    likesIncrease: metricsComparison.likes?.gap_percentage || sectorBenchmarks.performance_vs_benchmark?.likes_delta || '+0%',
    comments: metricsComparison.comments?.page_average || sectorBenchmarks.page_metrics?.comments || 0,
    commentsBenchmark: metricsComparison.comments?.sector_benchmark || sectorBenchmarks.industry_averages?.comments || 0,
    commentsIncrease: metricsComparison.comments?.gap_percentage || sectorBenchmarks.performance_vs_benchmark?.comments_delta || '+0%',
    shares: metricsComparison.shares?.page_average || sectorBenchmarks.page_metrics?.shares || 0,
    sharesBenchmark: metricsComparison.shares?.sector_benchmark || sectorBenchmarks.industry_averages?.shares || 0,
    sharesIncrease: metricsComparison.shares?.gap_percentage || sectorBenchmarks.performance_vs_benchmark?.shares_delta || '+0%',
    engagementRate: metricsComparison.engagement_rate?.page_average || sectorBenchmarks.page_metrics?.engagement_rate || '0%',
    engagementRateBenchmark: metricsComparison.engagement_rate?.sector_benchmark || sectorBenchmarks.industry_averages?.engagement_rate || '0%'
  };
  const gaps = data.competitive_gaps || data.gaps || [];
  const opportunities = data.differentiation_opportunities || data.opportunities || [];
  // Support de multiples formats de nommage IA
  const strategies = data.strategies_to_adopt || data.leader_strategies_to_adopt || data.strategic_recommendations || data.strategies || [];
  const actionPlan = data.action_plan || data.plan_action || {};
  const immediateActions = actionPlan.immediate_actions || actionPlan.actions || data.immediate_actions || [];

  return (
    <div className="h-full bg-cream-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="ghost" className="text-steel-200 hover:text-navy">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux sessions
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-navy">Analyse Concurrence : {pageName}</h1>
              <p className="text-sm text-steel-200 mt-1">
                Modèle : {benchmarkData.model || 'Modèle par défaut'} • Coût : {benchmarkData.costCredits || 2} crédit(s)
              </p>
            </div>
          </div>
          <Button onClick={onExportPDF} className="bg-steel-600 hover:bg-steel-700">
            <Download className="w-4 h-4 mr-2" />
            Exporter en PDF
          </Button>
        </div>

        {/* Positionnement Concurrentiel */}
        <Card className="bg-gradient-to-r from-steel-500/10 to-navy-500/10 border-steel-500/20">
          <CardHeader>
            <CardTitle className="text-navy flex items-center gap-2">
              <Target className="w-5 h-5 text-steel-400" />
              Positionnement Concurrentiel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-steel-400">{globalScore}/10</div>
                <div className="text-sm text-steel-200 mt-1">Score Global</div>
              </div>
              <div className="bg-navy/10 border border-navy/20 rounded-lg p-4 text-center">
                <div className="text-sm text-steel-200 mb-1">{position.sector}</div>
                <div className="text-2xl font-bold text-navy">{position.category}</div>
                <div className="text-xs text-steel mt-1">Position vs Secteur</div>
              </div>
              <div className="bg-steel-500/10 border border-steel-500/20 rounded-lg p-4 text-center">
                <div className="text-sm text-steel-200 mb-1">Secteur</div>
                <div className="text-2xl font-bold text-steel-400">{position.categoryName}</div>
              </div>
            </div>
            {data.competitive_positioning?.summary && (
              <div className="mt-4 p-4 bg-white rounded-lg">
                <p className="text-sm text-steel-200">{data.competitive_positioning.summary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparaison aux Benchmarks Sectoriels */}
        <Card className="bg-white border-cream-300">
          <CardHeader>
            <CardTitle className="text-navy">Comparaison aux Benchmarks Sectoriels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-cream-50 border border-cream-300 rounded-lg p-4">
                <div className="text-xs text-steel mb-1">LIKES</div>
                <div className="text-2xl font-bold text-navy">{benchmarks.likes}</div>
                <div className="text-xs text-steel mt-1">Benchmark: {benchmarks.likesBenchmark}</div>
                <div className="text-sm text-green-400 mt-1">{benchmarks.likesIncrease}</div>
              </div>
              <div className="bg-cream-50 border border-cream-300 rounded-lg p-4">
                <div className="text-xs text-steel mb-1">COMMENTS</div>
                <div className="text-2xl font-bold text-navy">{benchmarks.comments}</div>
                <div className="text-xs text-steel mt-1">Benchmark: {benchmarks.commentsBenchmark}</div>
                <div className="text-sm text-green-400 mt-1">{benchmarks.commentsIncrease}</div>
              </div>
              <div className="bg-cream-50 border border-cream-300 rounded-lg p-4">
                <div className="text-xs text-steel mb-1">SHARES</div>
                <div className="text-2xl font-bold text-navy">{benchmarks.shares}</div>
                <div className="text-xs text-steel mt-1">Benchmark: {benchmarks.sharesBenchmark}</div>
                <div className="text-sm text-green-400 mt-1">{benchmarks.sharesIncrease}</div>
              </div>
              <div className="bg-cream-50 border border-cream-300 rounded-lg p-4">
                <div className="text-xs text-steel mb-1">ENGAGEMENT RATE</div>
                <div className="text-2xl font-bold text-navy">{benchmarks.engagementRate}</div>
                <div className="text-xs text-steel mt-1">Benchmark: {benchmarks.engagementRateBenchmark}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gaps Concurrentiels à Combler */}
        {gaps.length > 0 && (
          <Card className="bg-white border-cream-300">
            <CardHeader>
              <CardTitle className="text-navy flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-gold-400" />
                Gaps Concurrentiels à Combler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {gaps.map((gap: any, idx: number) => (
                <div key={idx} className="border-l-4 border-gold-500 bg-gold-500/10 p-4 rounded-r-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-navy mb-2">{gap.gap_name || gap.title}</h4>
                      <p className="text-sm text-steel-200 mb-2">
                        <span className="font-medium">État actuel:</span> {gap.current_state || gap.description}
                      </p>
                      {gap.how_to_close && (
                        <p className="text-sm text-steel-200 mb-2">
                          <span className="font-medium text-steel-200">Comment combler:</span> {gap.how_to_close}
                        </p>
                      )}
                      {gap.expected_impact && (
                        <p className="text-sm text-green-400">
                          <span className="font-medium">Impact attendu:</span> {gap.expected_impact}
                        </p>
                      )}
                    </div>
                    {gap.priority && (
                      <Badge className={`ml-4 ${
                        gap.priority === 'HIGH' ? 'bg-red-500' : 
                        gap.priority === 'MEDIUM' ? 'bg-gold-500' : 
                        'bg-yellow-500'
                      }`}>
                        {gap.priority}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Opportunités de Différenciation */}
        {opportunities.length > 0 && (
          <Card className="bg-white border-cream-300">
            <CardHeader>
              <CardTitle className="text-navy flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Opportunités de Différenciation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {opportunities.map((opp: any, idx: number) => (
                <div key={idx} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-400 mb-2">{opp.opportunity_name || opp.title}</h4>
                  <p className="text-sm text-steel-200">{opp.description}</p>
                  {opp.why_unique && (
                    <p className="text-xs text-steel-400 mt-2">✨ {opp.why_unique}</p>
                  )}
                  {opp.implementation_difficulty && (
                    <p className="text-xs text-steel-200 mt-1">Difficulté: {opp.implementation_difficulty}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Stratégies à Adopter des Leaders */}
        {strategies.length > 0 && (
          <Card className="bg-white border-cream-300">
            <CardHeader>
              <CardTitle className="text-navy flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-navy" />
                Stratégies à Adopter des Leaders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {strategies.map((strategy: any, idx: number) => (
                <div key={idx} className="bg-navy/10 border border-navy/20 rounded-lg p-4">
                  <h4 className="font-semibold text-navy mb-2">{strategy.strategy_name || strategy.title}</h4>
                  <p className="text-sm text-steel-200 mb-2">
                    <span className="font-medium text-steel-200">Source:</span> {strategy.source || 'Leaders du secteur'}
                  </p>
                  <p className="text-sm text-steel-200 mb-3">
                    <span className="font-medium">Adaptation:</span> {strategy.how_to_adapt || strategy.description}
                  </p>
                  {strategy.example_post && (
                    <div className="bg-cream-50 border border-cream-300 rounded p-3 mt-2">
                      <p className="text-xs text-steel mb-1">Exemple de post:</p>
                      <p className="text-sm text-steel-200 italic">{strategy.example_post}</p>
                    </div>
                  )}
                  {strategy.expected_benefit && (
                    <p className="text-sm text-steel-400 mt-2">
                      <span className="font-medium">Impact attendu:</span> {strategy.expected_benefit}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recommandations Stratégiques (Plan d'Action) */}
        {immediateActions.length > 0 && (
          <Card className="bg-white border-cream-300">
            <CardHeader>
              <CardTitle className="text-navy flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-gold" />
                Recommandations Stratégiques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {immediateActions.map((action: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gold/5 border border-gold/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-navy">{action.action || action.title || action.recommendation}</p>
                      {action.expected_result && (
                        <p className="text-sm text-green-600 mt-1">Résultat attendu : {action.expected_result}</p>
                      )}
                      {action.effort && (
                        <Badge className={`mt-2 text-[10px] ${
                          action.effort === 'Faible' ? 'bg-green-100 text-green-700' :
                          action.effort === 'Moyen' ? 'bg-gold/20 text-gold' :
                          'bg-red-100 text-red-700'
                        }`}>
                          Effort : {action.effort}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BenchmarkDetailView;
