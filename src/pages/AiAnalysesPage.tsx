import React, { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useCredits } from '@/hooks/useCredits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Facebook,
  Calendar,
  Loader2,
  AlertCircle,
  FileText,
  TrendingUp,
  GitCompare,
  Download,
  Coins
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import AuditDetailView from '@/components/dashboard/AuditDetailView';
import BenchmarkDetailView from '@/components/dashboard/BenchmarkDetailView';
import api from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

const AiAnalysesPage: React.FC = () => {
  const { userData, error, isLoading, fetchDashboardData } = useDashboard();
  const { balance, refreshBalance } = useCredits();
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  
  const [loadingAnalyses, setLoadingAnalyses] = useState<Record<string, boolean>>({});
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'to_analyze' | 'analyzed' | 'benchmarks'>('to_analyze');

  // Sessions avec analyses complètes
  const analyzedSessions = useMemo(() => {
    if (!userData?.sessions) return [];
    return userData.sessions.filter((s: any) => 
      s.scrape_type === 'facebook_pages' && 
      s.ai_analysis_facebook_pages_by_page
    );
  }, [userData]);

  // Sessions avec benchmarks
  const benchmarkSessions = useMemo(() => {
    if (!userData?.sessions) return [];
    return userData.sessions.filter((s: any) => 
      s.scrape_type === 'facebook_pages' && 
      s.ai_benchmark_facebook_pages_by_page
    );
  }, [userData]);

  // Calculer les stats depuis les données réelles
  const computedStats = useMemo(() => {
    if (!userData?.sessions) {
      return {
        totalAnalyses: 0,
        totalPagesAvailable: 0,
        lastAnalysisDate: null,
        totalBenchmarks: 0
      };
    }

    let totalAnalyses = 0;
    let totalBenchmarks = 0;
    let totalPagesAvailable = 0;
    let lastAnalysisDate: Date | null = null;

    userData.sessions.forEach((session: any) => {
      if (session.scrape_type === 'facebook_pages') {
        // Compter les pages disponibles (sub_sessions)
        if (session.sub_sessions && Array.isArray(session.sub_sessions)) {
          totalPagesAvailable += session.sub_sessions.length;
        }

        // Compter les analyses par page
        if (session.ai_analysis_facebook_pages_by_page) {
          const byPage = typeof session.ai_analysis_facebook_pages_by_page === 'string'
            ? JSON.parse(session.ai_analysis_facebook_pages_by_page)
            : session.ai_analysis_facebook_pages_by_page;
          
          if (byPage && typeof byPage === 'object') {
            totalAnalyses += Object.keys(byPage).length;
          }
        }

        // Compter les benchmarks
        if (session.ai_benchmark_facebook_pages_by_page) {
          const benchmarks = typeof session.ai_benchmark_facebook_pages_by_page === 'string'
            ? JSON.parse(session.ai_benchmark_facebook_pages_by_page)
            : session.ai_benchmark_facebook_pages_by_page;
          
          if (benchmarks && typeof benchmarks === 'object') {
            totalBenchmarks += Object.keys(benchmarks).length;
          }
        }

        // Trouver la dernière date d'analyse
        if (session.ai_analysis_created_at) {
          const analysisDate = new Date(session.ai_analysis_created_at);
          if (!lastAnalysisDate || analysisDate > lastAnalysisDate) {
            lastAnalysisDate = analysisDate;
          }
        }
      }
    });

    return {
      totalAnalyses,
      totalPagesAvailable,
      lastAnalysisDate,
      totalBenchmarks
    };
  }, [userData]);

  // Estimation de coût côté client (basée sur COST_MATRIX backend)
  const estimateAiCost = (postsCount: number) => {
    // ai_analysis: perPage=2, perPost=0.05
    return 2 + postsCount * 0.05;
  };

  const estimateBenchmarkCostLocal = (postsCount: number) => {
    // benchmark: perPage=2, perPost=0.1, aiAnalysis=3, reportGeneration=1
    return 2 + postsCount * 0.1 + 3 + 1;
  };

  const userBalance = balance?.total ?? 0;

  // Filtrer les sessions Facebook Pages avec analyses
  const facebookPagesSessions = useMemo(() => {
    if (!userData?.sessions) return [];
    
    return userData.sessions.filter((s: any) => 
      s.scrape_type === 'facebook_pages' && 
      s.status === 'completed' &&
      s.sub_sessions &&
      s.sub_sessions.length > 0
    );
  }, [userData]);

  // Lancer une analyse IA pour une page
  const launchAiAnalysis = async (sessionId: string, pageName: string) => {
    const key = `${sessionId}-${pageName}`;
    setLoadingAnalyses(prev => ({ ...prev, [key]: true }));

    try {
      const response = await api.post(`/sessions/facebook-pages/${sessionId}/ai-analysis/page`, { pageName });
      
      toast({
        title: 'Analyse lancée',
        description: `L'analyse IA pour ${pageName} a été lancée avec succès.`,
      });

      // Rafraîchir les données
      await fetchDashboardData();
      await refreshBalance();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Erreur lors du lancement de l\'analyse',
        variant: 'destructive'
      });
    } finally {
      setLoadingAnalyses(prev => ({ ...prev, [key]: false }));
    }
  };

  // Lancer un benchmark pour une page
  const launchBenchmark = async (sessionId: string, pageName: string) => {
    const key = `benchmark-${sessionId}-${pageName}`;
    setLoadingAnalyses(prev => ({ ...prev, [key]: true }));

    try {
      const response = await api.post(`/sessions/facebook-pages/${sessionId}/ai-benchmark/page`, { pageName });
      
      toast({
        title: 'Benchmark lancé',
        description: `Le benchmark pour ${pageName} a été lancé avec succès.`,
      });

      await fetchDashboardData();
      await refreshBalance();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Erreur lors du lancement du benchmark',
        variant: 'destructive'
      });
    } finally {
      setLoadingAnalyses(prev => ({ ...prev, [key]: false }));
    }
  };

  // Voir une analyse
  const viewAnalysis = (session: any, pageName: string, type: 'audit' | 'benchmark') => {
    setSelectedSession(session);
    
    if (type === 'audit' && session.ai_analysis_facebook_pages_by_page) {
      const analyses = typeof session.ai_analysis_facebook_pages_by_page === 'string'
        ? JSON.parse(session.ai_analysis_facebook_pages_by_page)
        : session.ai_analysis_facebook_pages_by_page;
      
      setSelectedAnalysis({
        type: 'audit',
        pageName,
        data: analyses[pageName]
      });
    } else if (type === 'benchmark' && session.ai_benchmark_facebook_pages_by_page) {
      const benchmarks = typeof session.ai_benchmark_facebook_pages_by_page === 'string'
        ? JSON.parse(session.ai_benchmark_facebook_pages_by_page)
        : session.ai_benchmark_facebook_pages_by_page;
      
      setSelectedAnalysis({
        type: 'benchmark',
        pageName,
        data: benchmarks[pageName]
      });
    }
  };

  // Retour à la liste
  const handleBack = () => {
    setSelectedAnalysis(null);
    setSelectedSession(null);
  };

  // Export PDF - Version Corporate Moderne
  const handleExportPDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      
      toast({
        title: 'Export en cours',
        description: 'Generation du rapport PDF...',
      });

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      // Fonction pour nettoyer le texte UTF-8 (remplacer les caracteres speciaux)
      const cleanText = (text: string): string => {
        if (!text) return '';
        return text
          .replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e').replace(/ë/g, 'e')
          .replace(/à/g, 'a').replace(/â/g, 'a').replace(/ä/g, 'a')
          .replace(/ù/g, 'u').replace(/û/g, 'u').replace(/ü/g, 'u')
          .replace(/ô/g, 'o').replace(/ö/g, 'o')
          .replace(/î/g, 'i').replace(/ï/g, 'i')
          .replace(/ç/g, 'c')
          .replace(/É/g, 'E').replace(/È/g, 'E').replace(/Ê/g, 'E')
          .replace(/À/g, 'A').replace(/Â/g, 'A')
          .replace(/Ù/g, 'U').replace(/Û/g, 'U')
          .replace(/Ô/g, 'O')
          .replace(/Î/g, 'I')
          .replace(/Ç/g, 'C')
          .replace(/œ/g, 'oe').replace(/Œ/g, 'OE')
          .replace(/«/g, '"').replace(/»/g, '"')
          .replace(/'/g, "'").replace(/'/g, "'")
          .replace(/"/g, '"').replace(/"/g, '"')
          .replace(/–/g, '-').replace(/—/g, '-')
          .replace(/…/g, '...')
          .replace(/💡/g, '[!]').replace(/✓/g, '[OK]').replace(/⚠/g, '[!]')
          .replace(/✨/g, '*').replace(/🔧/g, '[>]').replace(/👍/g, '+')
          .replace(/💬/g, '#').replace(/🔄/g, '~');
      };
      
      // Fonction pour ajouter une nouvelle page si necessaire
      let yPos = 0;
      const checkNewPage = (neededSpace: number = 20) => {
        if (yPos > pageHeight - neededSpace - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };
      
      // Fonction pour dessiner un rectangle arrondi
      const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, fillColor: number[]) => {
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        doc.roundedRect(x, y, w, h, r, r, 'F');
      };

      // ========== EN-TETE CORPORATE ==========
      // Bandeau superieur
      drawRoundedRect(0, 0, pageWidth, 45, 0, [15, 17, 23]); // #0f1117
      
      // Logo / Titre
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      const reportTitle = selectedAnalysis?.type === 'audit' ? 'RAPPORT D\'ANALYSE IA' : 'RAPPORT DE BENCHMARK';
      doc.text(cleanText(reportTitle), margin, 18);
      
      // Nom de la page analysee
      doc.setFontSize(14);
      doc.setTextColor(96, 165, 250); // blue-400
      doc.text(cleanText(selectedAnalysis?.pageName || 'Page Facebook'), margin, 28);
      
      // Date et heure
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175); // gray-400
      const now = new Date();
      const dateStr = `Genere le ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} a ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      doc.text(dateStr, margin, 38);
      
      // Modele IA utilise
      const modelInfo = `Modele: ${selectedAnalysis?.data?.model || 'google/gemini-2.0-flash-001'} | Cout: ${selectedAnalysis?.data?.costCredits || 2} credit(s)`;
      doc.text(cleanText(modelInfo), pageWidth - margin - doc.getTextWidth(modelInfo), 38);
      
      yPos = 55;
      
      const data = selectedAnalysis?.data;
      if (data) {
        const parsedData = typeof data.raw === 'string' ? JSON.parse(data.raw) : (data.raw || data);
        
        // Fonction pour ajouter une section avec titre
        const addSection = (title: string, color: number[]) => {
          checkNewPage(25);
          drawRoundedRect(margin, yPos, contentWidth, 8, 2, color);
          doc.setFontSize(11);
          doc.setTextColor(255, 255, 255);
          doc.text(cleanText(title), margin + 3, yPos + 5.5);
          yPos += 12;
        };
        
        // Fonction pour ajouter du texte avec retour a la ligne
        const addText = (text: string, indent: number = 0, fontSize: number = 9) => {
          doc.setFontSize(fontSize);
          doc.setTextColor(50, 50, 50);
          const lines = doc.splitTextToSize(cleanText(text), contentWidth - indent);
          lines.forEach((line: string) => {
            checkNewPage(8);
            doc.text(line, margin + indent, yPos);
            yPos += 4.5;
          });
        };
        
        // Fonction pour ajouter un item de liste
        const addListItem = (bullet: string, title: string, description: string, bulletColor: number[] = [59, 130, 246]) => {
          checkNewPage(15);
          doc.setFontSize(9);
          doc.setTextColor(bulletColor[0], bulletColor[1], bulletColor[2]);
          doc.text(bullet, margin + 2, yPos);
          doc.setTextColor(30, 30, 30);
          doc.setFont('helvetica', 'bold');
          const titleLines = doc.splitTextToSize(cleanText(title), contentWidth - 15);
          doc.text(titleLines[0] || '', margin + 8, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          if (description) {
            addText(description, 8, 8);
          }
          yPos += 2;
        };
        
        if (selectedAnalysis?.type === 'audit') {
          // ========== AUDIT PDF ==========
          
          // Score global avec design
          const globalScore = parsedData.audit_summary?.engagement_score?.score || 0;
          drawRoundedRect(margin, yPos, 50, 25, 3, [59, 130, 246]);
          doc.setFontSize(28);
          doc.setTextColor(255, 255, 255);
          doc.text(`${globalScore}/10`, margin + 8, yPos + 17);
          
          // Diagnostic global
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 50);
          const diagnosis = parsedData.audit_summary?.global_health || 'Analyse en cours...';
          const diagLines = doc.splitTextToSize(cleanText(diagnosis), contentWidth - 60);
          doc.text(diagLines, margin + 55, yPos + 8);
          yPos += 32;
          
          // Insight cle
          if (parsedData.audit_summary?.key_insight) {
            drawRoundedRect(margin, yPos, contentWidth, 18, 3, [254, 243, 199]); // amber-100
            doc.setFontSize(8);
            doc.setTextColor(180, 83, 9); // amber-700
            doc.text('[!] INSIGHT CLE', margin + 3, yPos + 5);
            doc.setFontSize(9);
            doc.setTextColor(120, 53, 15); // amber-900
            const insightLines = doc.splitTextToSize(cleanText(parsedData.audit_summary.key_insight), contentWidth - 6);
            doc.text(insightLines.slice(0, 2), margin + 3, yPos + 11);
            yPos += 22;
          }
          
          // Metriques moyennes
          addSection('METRIQUES MOYENNES', [59, 130, 246]);
          if (parsedData.quantitative_analysis?.averages) {
            const avg = parsedData.quantitative_analysis.averages;
            const metricsData = [
              { label: 'Likes', value: Math.round(avg.likes || 0) },
              { label: 'Commentaires', value: Math.round(avg.comments || 0) },
              { label: 'Partages', value: Math.round(avg.shares || 0) },
              { label: 'Engagement', value: Math.round(avg.engagement_total || 0) }
            ];
            const boxWidth = (contentWidth - 9) / 4;
            metricsData.forEach((m, i) => {
              const x = margin + (i * (boxWidth + 3));
              drawRoundedRect(x, yPos, boxWidth, 18, 2, [243, 244, 246]);
              doc.setFontSize(7);
              doc.setTextColor(107, 114, 128);
              doc.text(m.label, x + 3, yPos + 5);
              doc.setFontSize(14);
              doc.setTextColor(17, 24, 39);
              doc.text(m.value.toString(), x + 3, yPos + 14);
            });
            yPos += 24;
          }
          
          // Top Posts
          if (parsedData.quantitative_analysis?.top_posts?.length > 0) {
            addSection('TOP POSTS PERFORMANTS', [34, 197, 94]);
            parsedData.quantitative_analysis.top_posts.slice(0, 5).forEach((post: any, idx: number) => {
              const postText = post.texte?.substring(0, 100) || 'Post sans texte';
              const metrics = `${post.metrics?.likes || 0} likes | ${post.metrics?.comments || 0} com | ${post.metrics?.shares || 0} partages`;
              addListItem(`#${idx + 1}`, postText + '...', metrics, [34, 197, 94]);
              if (post.explanation) {
                addText('-> ' + post.explanation, 8, 8);
              }
            });
          }
          
          // Posts a ameliorer
          if (parsedData.quantitative_analysis?.flop_posts?.length > 0) {
            addSection('POSTS A AMELIORER', [239, 68, 68]);
            parsedData.quantitative_analysis.flop_posts.slice(0, 5).forEach((post: any, idx: number) => {
              const postText = post.texte?.substring(0, 100) || 'Post sans texte';
              addListItem(`#${idx + 1}`, postText + '...', post.explanation || '', [239, 68, 68]);
              if (post.improvement_recommendation) {
                doc.setTextColor(234, 88, 12);
                addText('[>] Amelioration: ' + post.improvement_recommendation, 8, 8);
              }
            });
          }
          
          // Ce qui fonctionne bien
          if (parsedData.what_is_working_well?.length > 0) {
            addSection('CE QUI FONCTIONNE BIEN', [34, 197, 94]);
            parsedData.what_is_working_well.forEach((item: any) => {
              addListItem('[OK]', item.strength || '', item.data_proof || '', [34, 197, 94]);
              if (item.recommendation) {
                addText('Recommandation: ' + item.recommendation, 8, 8);
              }
            });
          }
          
          // Points a ameliorer
          if (parsedData.pain_points_and_fixes?.length > 0) {
            addSection('POINTS A AMELIORER', [239, 68, 68]);
            parsedData.pain_points_and_fixes.forEach((item: any) => {
              addListItem('[!]', item.problem || '', item.data_evidence || '', [239, 68, 68]);
              if (item.quick_fix?.action) {
                doc.setTextColor(34, 197, 94);
                addText('[>] Solution: ' + item.quick_fix.action, 8, 8);
                if (item.quick_fix.example) {
                  addText('Exemple: ' + item.quick_fix.example, 12, 8);
                }
              }
            });
          }
          
          // Idees creatives
          if (parsedData.creative_ideas_to_test?.length > 0) {
            addSection('IDEES CREATIVES A TESTER', [245, 158, 11]);
            parsedData.creative_ideas_to_test.forEach((idea: any) => {
              addListItem('*', idea.idea_name || '', idea.description || '', [245, 158, 11]);
              if (idea.implementation?.example_post) {
                addText('Exemple de post: "' + idea.implementation.example_post + '"', 8, 8);
              }
              if (idea.expected_benefit) {
                addText('Benefice attendu: ' + idea.expected_benefit, 8, 8);
              }
            });
          }
          
          // Verdict final
          if (parsedData.final_verdict) {
            addSection('VERDICT FINAL', [99, 102, 241]);
            if (parsedData.final_verdict.one_thing_to_stop) {
              addListItem('X', 'A ARRETER', parsedData.final_verdict.one_thing_to_stop, [239, 68, 68]);
            }
            if (parsedData.final_verdict.one_thing_to_start) {
              addListItem('+', 'A COMMENCER', parsedData.final_verdict.one_thing_to_start, [34, 197, 94]);
            }
            if (parsedData.final_verdict.one_thing_to_amplify) {
              addListItem('^', 'A AMPLIFIER', parsedData.final_verdict.one_thing_to_amplify, [59, 130, 246]);
            }
          }
          
        } else if (selectedAnalysis?.type === 'benchmark') {
          // ========== BENCHMARK PDF ==========
          
          // Support des deux formats: nouveau (benchmark_positioning) et ancien (competitive_positioning)
          const globalScore = parsedData.benchmark_positioning?.overall_score || parsedData.competitive_positioning?.overall_score || 0;
          drawRoundedRect(margin, yPos, 50, 25, 3, [168, 85, 247]);
          doc.setFontSize(28);
          doc.setTextColor(255, 255, 255);
          doc.text(`${globalScore}/10`, margin + 8, yPos + 17);
          
          // Positionnement
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 50);
          const sector = parsedData.meta?.sector_detected || parsedData.meta?.detected_sector?.primary || 'Secteur non detecte';
          const position = parsedData.benchmark_positioning?.position || parsedData.competitive_positioning?.sector_position || 'Position non determinee';
          doc.text(cleanText(`Secteur: ${sector}`), margin + 55, yPos + 8);
          doc.text(cleanText(`Position: ${position}`), margin + 55, yPos + 15);
          yPos += 32;
          
          // Benchmarks sectoriels - Support des deux formats
          addSection('COMPARAISON AUX BENCHMARKS SECTORIELS', [168, 85, 247]);
          const metricsComp = parsedData.metrics_comparison || {};
          const sectorBench = parsedData.sector_benchmarks || {};
          
          // Nouveau format: metrics_comparison.likes.page_average, ancien: sector_benchmarks.page_metrics.likes
          const benchData = [
            { 
              label: 'Likes', 
              value: metricsComp.likes?.page_average || sectorBench.page_metrics?.likes || 0, 
              bench: metricsComp.likes?.sector_benchmark || sectorBench.industry_averages?.likes || 0, 
              delta: metricsComp.likes?.gap_percentage || sectorBench.performance_vs_benchmark?.likes_delta || '' 
            },
            { 
              label: 'Comments', 
              value: metricsComp.comments?.page_average || sectorBench.page_metrics?.comments || 0, 
              bench: metricsComp.comments?.sector_benchmark || sectorBench.industry_averages?.comments || 0, 
              delta: metricsComp.comments?.gap_percentage || sectorBench.performance_vs_benchmark?.comments_delta || '' 
            },
            { 
              label: 'Shares', 
              value: metricsComp.shares?.page_average || sectorBench.page_metrics?.shares || 0, 
              bench: metricsComp.shares?.sector_benchmark || sectorBench.industry_averages?.shares || 0, 
              delta: metricsComp.shares?.gap_percentage || sectorBench.performance_vs_benchmark?.shares_delta || '' 
            },
            { 
              label: 'Engagement', 
              value: metricsComp.engagement_rate?.page_average || sectorBench.page_metrics?.engagement_rate || '0%', 
              bench: metricsComp.engagement_rate?.sector_benchmark || sectorBench.industry_averages?.engagement_rate || '0%', 
              delta: '' 
            }
          ];
          
          const boxWidth = (contentWidth - 9) / 4;
          benchData.forEach((m, i) => {
            const x = margin + (i * (boxWidth + 3));
            drawRoundedRect(x, yPos, boxWidth, 28, 2, [243, 244, 246]);
            doc.setFontSize(7);
            doc.setTextColor(107, 114, 128);
            doc.text(m.label.toUpperCase(), x + 3, yPos + 5);
            doc.setFontSize(14);
            doc.setTextColor(17, 24, 39);
            doc.text(String(m.value), x + 3, yPos + 14);
            doc.setFontSize(7);
            doc.setTextColor(107, 114, 128);
            doc.text(`Bench: ${m.bench}`, x + 3, yPos + 20);
            if (m.delta) {
              doc.setTextColor(34, 197, 94);
              doc.text(String(m.delta), x + 3, yPos + 25);
            }
          });
          yPos += 34;
          
          // Gaps concurrentiels
          if (parsedData.competitive_gaps?.length > 0) {
            addSection('GAPS CONCURRENTIELS A COMBLER', [249, 115, 22]);
            parsedData.competitive_gaps.forEach((gap: any) => {
              const severity = gap.severity || 'MEDIUM';
              const severityColor = severity === 'HIGH' ? [239, 68, 68] : severity === 'MEDIUM' ? [249, 115, 22] : [234, 179, 8];
              addListItem(`[${severity}]`, gap.gap_name || '', gap.current_state || '', severityColor);
              if (gap.sector_best_practice) {
                addText('Best practice: ' + gap.sector_best_practice, 8, 8);
              }
              if (gap.impact_if_fixed) {
                doc.setTextColor(34, 197, 94);
                addText('Impact si corrige: ' + gap.impact_if_fixed, 8, 8);
              }
            });
          }
          
          // Opportunites de differenciation
          if (parsedData.differentiation_opportunities?.length > 0) {
            addSection('OPPORTUNITES DE DIFFERENCIATION', [234, 179, 8]);
            parsedData.differentiation_opportunities.forEach((opp: any) => {
              addListItem('*', opp.opportunity || opp.opportunity_name || '', opp.why_unique || '', [234, 179, 8]);
              if (opp.implementation) {
                addText('Implementation: ' + opp.implementation, 8, 8);
              }
              if (opp.competitive_advantage) {
                addText('Avantage: ' + opp.competitive_advantage, 8, 8);
              }
            });
          }
          
          // Strategies a adopter
          if (parsedData.strategies_to_adopt?.length > 0) {
            addSection('STRATEGIES A ADOPTER DES LEADERS', [59, 130, 246]);
            parsedData.strategies_to_adopt.forEach((strat: any) => {
              addListItem('->', strat.strategy_name || '', strat.adaptation || '', [59, 130, 246]);
              if (strat.source) {
                addText('Source: ' + strat.source, 8, 8);
              }
              if (strat.example_post) {
                drawRoundedRect(margin + 8, yPos, contentWidth - 16, 12, 2, [243, 244, 246]);
                doc.setFontSize(7);
                doc.setTextColor(107, 114, 128);
                doc.text('Exemple de post:', margin + 10, yPos + 4);
                doc.setFontSize(8);
                doc.setTextColor(55, 65, 81);
                const exLines = doc.splitTextToSize(cleanText(strat.example_post), contentWidth - 24);
                doc.text(exLines[0] || '', margin + 10, yPos + 9);
                yPos += 15;
              }
              if (strat.expected_impact) {
                addText('Impact attendu: ' + strat.expected_impact, 8, 8);
              }
            });
          }
          
          // Plan d'action
          if (parsedData.action_plan) {
            addSection('PLAN D\'ACTION', [99, 102, 241]);
            if (parsedData.action_plan.immediate_actions?.length > 0) {
              doc.setFontSize(9);
              doc.setTextColor(99, 102, 241);
              doc.text('Actions immediates:', margin, yPos);
              yPos += 5;
              parsedData.action_plan.immediate_actions.forEach((action: any) => {
                addListItem('>', action.action || '', `Effort: ${action.effort || 'N/A'} | Resultat: ${action.expected_result || 'N/A'}`, [99, 102, 241]);
              });
            }
          }
        }
      }
      
      // ========== PIED DE PAGE ==========
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawRoundedRect(0, pageHeight - 15, pageWidth, 15, 0, [243, 244, 246]);
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text('EasyScrapy - Marketplace Scraper Pro', margin, pageHeight - 6);
        doc.text(`Page ${i}/${totalPages}`, pageWidth - margin - 20, pageHeight - 6);
        doc.text(cleanText(selectedAnalysis?.pageName || ''), pageWidth / 2, pageHeight - 6, { align: 'center' });
      }
      
      // Sauvegarder
      const safePageName = (selectedAnalysis?.pageName || 'analyse').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `rapport_${selectedAnalysis?.type}_${safePageName}_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.pdf`;
      doc.save(fileName);
      
      toast({
        title: 'Export reussi',
        description: 'Le rapport PDF a ete telecharge avec succes',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter le PDF',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] bg-cream-50">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-cream-50 p-6">
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center">
              <AlertCircle className="mr-2" />
              Erreur
            </CardTitle>
          </CardHeader>
          <CardContent className="text-red-300">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Afficher la vue détaillée si une analyse est sélectionnée
  if (selectedAnalysis) {
    if (selectedAnalysis.type === 'audit') {
      return (
        <AuditDetailView
          pageName={selectedAnalysis.pageName}
          analysisData={selectedAnalysis.data}
          onBack={handleBack}
          onExportPDF={handleExportPDF}
        />
      );
    } else if (selectedAnalysis.type === 'benchmark') {
      return (
        <BenchmarkDetailView
          pageName={selectedAnalysis.pageName}
          benchmarkData={selectedAnalysis.data}
          onBack={handleBack}
          onExportPDF={handleExportPDF}
        />
      );
    }
  }

  return (
    <div className="h-full bg-cream-50">
      <DashboardHeader />
      
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pt-12 md:pt-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">Analyses IA</h1>
          <p className="text-steel mt-1">Obtenez des insights actionnables grâce à l'intelligence artificielle</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-navy-700">Analyses IA</CardTitle>
              <Sparkles className="h-5 w-5 text-gold-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-gold-400">{computedStats.totalAnalyses}</div>
              <p className="text-xs text-steel mt-1">Générées ce mois</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-navy-700">Pages disponibles</CardTitle>
              <Facebook className="h-5 w-5 text-steel-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-steel-400">{computedStats.totalPagesAvailable}</div>
              <p className="text-xs text-steel mt-1">Prêtes à analyser</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-navy-700">Insights générés</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-green-400">{computedStats.totalAnalyses * 47}</div>
              <p className="text-xs text-steel mt-1">Recommandations</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-navy-700">Benchmarks</CardTitle>
              <GitCompare className="h-5 w-5 text-steel-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-steel-400">{computedStats.totalBenchmarks}</div>
              <p className="text-xs text-steel mt-1">Comparaisons</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 border-b border-cream-300 overflow-x-auto">
          <Button
            variant="ghost"
            className={`rounded-none text-xs sm:text-sm px-2 sm:px-4 ${activeTab === 'to_analyze' ? 'border-b-2 border-gold text-gold-600' : 'text-steel hover:text-navy'}`}
            onClick={() => setActiveTab('to_analyze')}
          >
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">À analyser</span>
            <Badge className="ml-1 sm:ml-2 bg-gold/20 text-gold-400 border-gold/30 text-[10px] sm:text-xs">
              {facebookPagesSessions.reduce((acc: number, s: any) => acc + (s.sub_sessions?.length || 0), 0)}
            </Badge>
          </Button>
          <Button
            variant="ghost"
            className={`rounded-none text-xs sm:text-sm px-2 sm:px-4 ${activeTab === 'analyzed' ? 'border-b-2 border-gold text-gold-600' : 'text-steel hover:text-navy'}`}
            onClick={() => setActiveTab('analyzed')}
          >
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Analysées</span>
            <Badge className={`ml-1 sm:ml-2 text-[10px] sm:text-xs ${activeTab === 'analyzed' ? 'bg-green-500/20 text-green-400' : 'bg-navy text-cream-400'}`}>
              {computedStats.totalAnalyses}
            </Badge>
          </Button>
          <Button
            variant="ghost"
            className={`rounded-none text-xs sm:text-sm px-2 sm:px-4 ${activeTab === 'benchmarks' ? 'border-b-2 border-gold text-gold-600' : 'text-steel hover:text-navy'}`}
            onClick={() => setActiveTab('benchmarks')}
          >
            <GitCompare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Benchmarks</span>
            <Badge className={`ml-1 sm:ml-2 text-[10px] sm:text-xs ${activeTab === 'benchmarks' ? 'bg-steel/20 text-steel-400' : 'bg-navy text-cream-400'}`}>
              {computedStats.totalBenchmarks}
            </Badge>
          </Button>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'to_analyze' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Credit Balance Info */}
          <Card className={`border shadow-sm ${userBalance > 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${userBalance > 0 ? 'bg-green-100' : 'bg-amber-100'}`}>
                  <Coins className={`w-5 h-5 ${userBalance > 0 ? 'text-green-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-navy">Votre solde</p>
                  <p className={`text-xl font-bold ${userBalance > 0 ? 'text-green-700' : 'text-amber-700'}`}>
                    {userBalance.toFixed(1)} <span className="text-sm font-normal text-steel">crédits</span>
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-steel space-y-1">
                <p>Analyse IA : ~2 cr/page + 0.05 cr/post</p>
                <p>Benchmark : ~6 cr/page + 0.1 cr/post</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Colonne gauche - Pages à analyser */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-steel" />
              <h2 className="text-lg font-semibold text-navy">Pages à analyser</h2>
            </div>

            {facebookPagesSessions.length === 0 ? (
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardContent className="p-6 text-center">
                  <Facebook className="w-12 h-12 text-steel mx-auto mb-3" />
                  <p className="text-steel">Aucune page Facebook disponible</p>
                  <p className="text-sm text-steel mt-1">Extrayez d'abord des pages Facebook</p>
                </CardContent>
              </Card>
            ) : (
              facebookPagesSessions.map((session: any) => (
                <Card key={session.id} className="bg-white border-cream-300 shadow-sm hover:border-gold-300 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-steel/20 rounded-lg">
                          <Facebook className="w-5 h-5 text-steel-400" />
                        </div>
                        <div>
                          <CardTitle className="text-navy text-base font-semibold">
                            Session {session.id.substring(0, 8)}
                          </CardTitle>
                          <p className="text-sm text-steel-200 mt-1">
                            {session.sub_sessions?.length || 0} page{(session.sub_sessions?.length || 0) > 1 ? 's' : ''} • {format(new Date(session.created_at), 'd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {session.sub_sessions?.map((sub: any, idx: number) => {
                      const hasAudit = session.ai_analysis_facebook_pages_by_page?.[sub.pageName];
                      const hasBenchmark = session.ai_benchmark_facebook_pages_by_page?.[sub.pageName];
                      const auditKey = `${session.id}-${sub.pageName}`;
                      const benchmarkKey = `benchmark-${session.id}-${sub.pageName}`;
                      const postsCount = sub.postsData?.length || sub.postsCount || 0;
                      const aiCost = estimateAiCost(postsCount);
                      const benchCost = estimateBenchmarkCostLocal(postsCount);
                      const canAffordAi = userBalance >= aiCost;
                      const canAffordBench = userBalance >= benchCost;

                      return (
                        <div key={idx} className="p-3 bg-cream-50 rounded-lg border border-cream-300">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-navy">{sub.pageName}</p>
                              <p className="text-xs text-steel mt-1">
                                {postsCount} posts • {(sub.infoData?.length || (sub.infoStatus === 'SUCCEEDED' ? 1 : 0))} infos
                              </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
                              {hasAudit ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
                                  onClick={() => viewAnalysis(session, sub.pageName, 'audit')}
                                >
                                  <FileText className="w-4 h-4 mr-1" />
                                  Voir rapport
                                </Button>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${canAffordAi ? 'border-green-300 text-green-600' : 'border-red-300 text-red-500'}`}>
                                    {aiCost.toFixed(1)} cr
                                  </Badge>
                                  <Button
                                    size="sm"
                                    className="bg-gold hover:bg-gold-600 text-white"
                                    onClick={() => launchAiAnalysis(session.id, sub.pageName)}
                                    disabled={loadingAnalyses[auditKey] || !canAffordAi}
                                    title={canAffordAi ? `Analyser (${aiCost.toFixed(1)} crédits)` : `Crédits insuffisants (${aiCost.toFixed(1)} requis)`}
                                  >
                                    {loadingAnalyses[auditKey] ? (
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-4 h-4 mr-1" />
                                    )}
                                    Analyser
                                  </Button>
                                </div>
                              )}
                              {hasBenchmark ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-steel/20 border-steel/30 text-steel-600 hover:bg-steel-500/30"
                                  onClick={() => viewAnalysis(session, sub.pageName, 'benchmark')}
                                  title="Voir l'analyse concurrentielle"
                                >
                                  <GitCompare className="w-4 h-4 mr-1" />
                                  Benchmark
                                </Button>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${canAffordBench ? 'border-green-300 text-green-600' : 'border-red-300 text-red-500'}`}>
                                    {benchCost.toFixed(1)} cr
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-steel-300 text-steel-600 hover:bg-steel-50 hover:border-steel-400"
                                    onClick={() => launchBenchmark(session.id, sub.pageName)}
                                    disabled={loadingAnalyses[benchmarkKey] || !canAffordBench}
                                    title={canAffordBench ? `Benchmark (${benchCost.toFixed(1)} crédits)` : `Crédits insuffisants (${benchCost.toFixed(1)} requis)`}
                                  >
                                    {loadingAnalyses[benchmarkKey] ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Analyse...
                                      </>
                                    ) : (
                                      <>
                                        <GitCompare className="w-4 h-4 mr-1" />
                                        Benchmark
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Colonne droite - Analyses récentes */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-400" />
              <h2 className="text-lg font-semibold text-navy">Analyses récentes</h2>
            </div>

            {computedStats.totalAnalyses === 0 ? (
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardContent className="p-6 text-center">
                  <Sparkles className="w-12 h-12 text-steel mx-auto mb-3" />
                  <p className="text-steel">Aucune analyse disponible</p>
                  <p className="text-sm text-steel mt-1">Lancez votre première analyse</p>
                </CardContent>
              </Card>
            ) : (
              facebookPagesSessions
                .filter((s: any) => s.ai_analysis_facebook_pages_by_page)
                .slice(0, 5)
                .map((session: any) => {
                  const analyses = typeof session.ai_analysis_facebook_pages_by_page === 'string'
                    ? JSON.parse(session.ai_analysis_facebook_pages_by_page)
                    : session.ai_analysis_facebook_pages_by_page;

                  return Object.entries(analyses || {}).map(([pageName, analysis]: [string, any]) => (
                    <Card key={`${session.id}-${pageName}`} className="bg-white border-cream-300 shadow-sm hover:border-gold-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                              <Sparkles className="w-5 h-5 text-green-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-navy">{pageName}</h3>
                              <div className="flex items-center gap-3 mt-1 text-xs text-steel">
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {analysis.raw?.split('\n').length || 0} insights
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(analysis.created_at || session.ai_analysis_created_at), 'd MMM', { locale: fr })}
                                </span>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                  {analysis.costCredits || 5} crédits
                                </Badge>
                                <Badge className="bg-navy text-cream-400 text-xs">
                                  {analysis.model || 'GPT-4'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-gold/20 border-gold/30 text-gold-400 hover:bg-gold/30"
                              onClick={() => viewAnalysis(session, pageName, 'audit')}
                            >
                              Voir rapport
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-steel-200 hover:text-navy"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ));
                })
            )}
          </div>
        </div>
        </div>
        )}

        {/* Onglet Analysées */}
        {activeTab === 'analyzed' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-navy">Pages analysées</h2>
            </div>

            {analyzedSessions.length === 0 ? (
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardContent className="p-6 text-center">
                  <Sparkles className="w-12 h-12 text-steel mx-auto mb-3" />
                  <p className="text-steel">Aucune analyse disponible</p>
                  <p className="text-sm text-steel mt-1">Lancez votre première analyse depuis l'onglet "À analyser"</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {analyzedSessions.map((session: any) => {
                  const analyses = typeof session.ai_analysis_facebook_pages_by_page === 'string'
                    ? JSON.parse(session.ai_analysis_facebook_pages_by_page)
                    : session.ai_analysis_facebook_pages_by_page;

                  return Object.entries(analyses || {}).map(([pageName, analysis]: [string, any]) => (
                    <Card 
                      key={`${session.id}-${pageName}`} 
                      className="bg-white border-cream-300 shadow-sm hover:border-gold-300 transition-colors cursor-pointer"
                      onClick={() => viewAnalysis(session, pageName, 'audit')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <Sparkles className="w-5 h-5 text-green-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-navy">{pageName}</h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-steel">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(analysis.created_at || session.ai_analysis_created_at || session.created_at), 'd MMM yyyy', { locale: fr })}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                {analysis.costCredits || 5} crédits
                              </Badge>
                              <Badge className="bg-navy text-cream-400 text-xs">
                                {analysis.model || 'GPT-4'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewAnalysis(session, pageName, 'audit');
                          }}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Voir le rapport
                        </Button>
                      </CardContent>
                    </Card>
                  ));
                })}
              </div>
            )}
          </div>
        )}

        {/* Onglet Benchmarks */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <GitCompare className="w-5 h-5 text-steel-400" />
              <h2 className="text-lg font-semibold text-navy">Benchmarks concurrentiels</h2>
            </div>

            {benchmarkSessions.length === 0 ? (
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardContent className="p-6 text-center">
                  <GitCompare className="w-12 h-12 text-steel mx-auto mb-3" />
                  <p className="text-steel">Aucun benchmark disponible</p>
                  <p className="text-sm text-steel mt-1">Lancez un benchmark depuis l'onglet "À analyser" en cliquant sur l'icône de comparaison</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {benchmarkSessions.map((session: any) => {
                  const benchmarks = typeof session.ai_benchmark_facebook_pages_by_page === 'string'
                    ? JSON.parse(session.ai_benchmark_facebook_pages_by_page)
                    : session.ai_benchmark_facebook_pages_by_page;

                  return Object.entries(benchmarks || {}).map(([pageName, benchmark]: [string, any]) => (
                    <Card 
                      key={`benchmark-${session.id}-${pageName}`} 
                      className="bg-white border-cream-300 shadow-sm hover:border-gold-300 transition-colors cursor-pointer"
                      onClick={() => viewAnalysis(session, pageName, 'benchmark')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-steel/20 rounded-lg">
                            <GitCompare className="w-5 h-5 text-steel-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-navy">{pageName}</h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-steel">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(benchmark.created_at || session.created_at), 'd MMM yyyy', { locale: fr })}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Badge className="bg-steel/20 text-steel-400 border-steel/30 text-xs">
                                {benchmark.costCredits || 5} crédits
                              </Badge>
                              <Badge className="bg-navy text-cream-400 text-xs">
                                Benchmark
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full mt-3 bg-gold hover:bg-gold-600 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewAnalysis(session, pageName, 'benchmark');
                          }}
                        >
                          <GitCompare className="w-4 h-4 mr-2" />
                          Voir le benchmark
                        </Button>
                      </CardContent>
                    </Card>
                  ));
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAnalysesPage;
