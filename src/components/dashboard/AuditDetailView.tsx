import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, TrendingUp, TrendingDown, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';

interface AuditDetailViewProps {
  pageName: string;
  analysisData: any;
  onBack: () => void;
  onExportPDF: () => void;
}

const AuditDetailView: React.FC<AuditDetailViewProps> = ({ pageName, analysisData, onBack, onExportPDF }) => {
  // Parser les données de l'analyse
  const parseAnalysisData = () => {
    try {
      if (typeof analysisData.raw === 'string') {
        return JSON.parse(analysisData.raw);
      }
      return analysisData.raw || analysisData;
    } catch (error) {
      console.error('Error parsing analysis data:', error);
      return null;
    }
  };

  const data = parseAnalysisData();

  if (!data) {
    return (
      <div className="p-6 bg-cream-50">
        <Button onClick={onBack} variant="ghost" className="mb-4 text-steel-200 hover:text-navy">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux sessions
        </Button>
        <Card className="bg-white border-cream-300">
          <CardContent className="p-6">
            <p className="text-steel-200">Impossible de charger les données d'analyse</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mapper la structure de l'IA vers les champs attendus
  const globalScore = data.audit_summary?.engagement_score?.score || 0;
  const keyInsight = data.audit_summary?.key_insight || "";
  const metrics = {
    avgLikes: data.quantitative_analysis?.averages?.likes || 0,
    avgComments: data.quantitative_analysis?.averages?.comments || 0,
    avgShares: data.quantitative_analysis?.averages?.shares || 0,
    totalEngagement: data.quantitative_analysis?.averages?.engagement_total || 0
  };
  const topPosts = data.quantitative_analysis?.top_posts || [];
  const worstPosts = data.quantitative_analysis?.flop_posts || [];
  const recommendations = {
    whatWorks: data.what_is_working_well || [],
    toImprove: data.pain_points_and_fixes || [],
    creativeIdeas: data.creative_ideas_to_test || []
  };

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
              <h1 className="text-2xl font-bold text-navy">Analyse IA : {pageName}</h1>
              <p className="text-sm text-steel-200 mt-1">
                Modèle : {analysisData.model || 'google/gemini-2.0-flash-001'} • Coût : {analysisData.costCredits || 2} crédit(s)
              </p>
            </div>
          </div>
          <Button onClick={onExportPDF} className="bg-navy hover:bg-navy-400">
            <Download className="w-4 h-4 mr-2" />
            Exporter en PDF
          </Button>
        </div>

        {/* Résumé Global */}
        <Card className="bg-white border-cream-300">
          <CardHeader>
            <CardTitle className="text-navy flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-navy" />
              Résumé Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-navy">{globalScore}</div>
                    <div className="text-sm text-steel-200 mt-1">Score d'engagement</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-steel-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-navy-500 to-steel-400" 
                        style={{ width: `${(globalScore / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gold-500/10 border border-gold-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-gold-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gold-400 text-sm">Insight clé</h4>
                    <p className="text-sm text-steel-200 mt-1">
                      {keyInsight || "Les posts avec visuels attractifs génèrent le plus d'engagement."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métriques Moyennes */}
        <Card className="bg-white border-cream-300">
          <CardHeader>
            <CardTitle className="text-navy">Métriques Moyennes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-navy/10 border border-navy/20 rounded-lg p-4 text-center">
                <div className="text-sm text-steel-200 mb-1">Likes moyens</div>
                <div className="text-3xl font-bold text-navy">{metrics.avgLikes || 0}</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                <div className="text-sm text-steel-200 mb-1">Commentaires moyens</div>
                <div className="text-3xl font-bold text-green-400">{metrics.avgComments || 0}</div>
              </div>
              <div className="bg-gold-500/10 border border-gold-500/20 rounded-lg p-4 text-center">
                <div className="text-sm text-steel-200 mb-1">Partages moyens</div>
                <div className="text-3xl font-bold text-gold-400">{metrics.avgShares || 0}</div>
              </div>
              <div className="bg-steel-500/10 border border-steel-500/20 rounded-lg p-4 text-center">
                <div className="text-sm text-steel-200 mb-1">Engagement total</div>
                <div className="text-3xl font-bold text-steel-400">{metrics.totalEngagement || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Posts */}
        {topPosts.length > 0 && (
          <Card className="bg-white border-cream-300">
            <CardHeader>
              <CardTitle className="text-navy flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Top Posts ({topPosts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topPosts.map((post: any, idx: number) => (
                <div key={idx} className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-green-500 text-white">#{post.rank || idx + 1}</Badge>
                    <div className="flex-1">
                      <p className="text-sm text-steel-200 line-clamp-2">{post.texte || post.text || 'Post classique'}</p>
                      <div className="flex gap-4 mt-2 text-xs text-steel">
                        <span>👍 {post.metrics?.likes || 0}</span>
                        <span>💬 {post.metrics?.comments || 0}</span>
                        <span>🔄 {post.metrics?.shares || 0}</span>
                      </div>
                      {post.explanation && (
                        <p className="text-xs text-green-400 mt-2">{post.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Posts à améliorer */}
        {worstPosts.length > 0 && (
          <Card className="bg-white border-cream-300">
            <CardHeader>
              <CardTitle className="text-navy flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                Posts à améliorer ({worstPosts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {worstPosts.map((post: any, idx: number) => (
                <div key={idx} className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-red-500 text-white">#{post.rank || idx + 1}</Badge>
                    <div className="flex-1">
                      <p className="text-sm text-steel-200 line-clamp-2">{post.texte || post.text || 'Post à optimiser'}</p>
                      <div className="flex gap-4 mt-2 text-xs text-steel">
                        <span>👍 {post.metrics?.likes || 0}</span>
                        <span>💬 {post.metrics?.comments || 0}</span>
                        <span>🔄 {post.metrics?.shares || 0}</span>
                      </div>
                      {post.explanation && (
                        <p className="text-xs text-red-400 mt-2">{post.explanation}</p>
                      )}
                      {post.improvement_recommendation && (
                        <p className="text-xs text-gold-400 mt-1">💡 {post.improvement_recommendation}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recommandations */}
        <Card className="bg-white border-cream-300">
          <CardHeader>
            <CardTitle className="text-navy">Recommandations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Ce qui fonctionne bien */}
            {recommendations.whatWorks && recommendations.whatWorks.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5" />
                  Ce qui fonctionne bien
                </h3>
                <div className="space-y-3">
                  {recommendations.whatWorks.map((item: any, idx: number) => (
                    <div key={idx} className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-navy mb-2">{item.strength || item.title}</h4>
                      <p className="text-sm text-steel-200">{item.data_proof || item.description}</p>
                      {item.recommendation && (
                        <p className="text-xs text-green-400 mt-2">💡 {item.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Points à améliorer */}
            {recommendations.toImprove && recommendations.toImprove.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5" />
                  Points à améliorer
                </h3>
                <div className="space-y-3">
                  {recommendations.toImprove.map((item: any, idx: number) => (
                    <div key={idx} className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-navy mb-2">{item.problem}</h4>
                      <p className="text-sm text-steel-200 mb-2">{item.data_evidence}</p>
                      {item.quick_fix && (
                        <div className="mt-2 bg-gold-500/10 border border-gold-500/20 rounded p-2">
                          <p className="text-xs text-gold-400 font-semibold">🔧 Solution rapide:</p>
                          <p className="text-xs text-steel-200 mt-1">{item.quick_fix.action}</p>
                          {item.quick_fix.example && (
                            <p className="text-xs text-steel-200 mt-1 italic">{item.quick_fix.example}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Idées créatives */}
            {recommendations.creativeIdeas && recommendations.creativeIdeas.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gold-400 flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5" />
                  Idées créatives à tester
                </h3>
                <div className="space-y-3">
                  {recommendations.creativeIdeas.map((idea: any, idx: number) => (
                    <div key={idx} className="bg-gold-500/10 border border-gold-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-gold-400 mb-2">{idea.idea_name}</h4>
                      <p className="text-sm text-steel-200 mb-2">{idea.description}</p>
                      {idea.implementation?.example_post && (
                        <div className="mt-2 bg-cream-50 border border-cream-300 rounded p-2">
                          <p className="text-xs text-steel mb-1">Exemple de post:</p>
                          <p className="text-xs text-steel-200 italic">{idea.implementation.example_post}</p>
                        </div>
                      )}
                      {idea.expected_benefit && (
                        <p className="text-xs text-steel-400 mt-2">✨ {idea.expected_benefit}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuditDetailView;
