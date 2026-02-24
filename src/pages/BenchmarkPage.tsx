import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Heart,
  MessageCircle,
  Clock,
  Target,
  Zap,
  Award,
  AlertCircle,
  Plus,
  X,
  RefreshCw,
  Download,
  Share2,
  Eye,
  Activity,
  Settings,
  Crown,
  Building2,
  FileText,
  MessageSquare,
  ThumbsUp,
  Coins,
  CheckCircle,
  AlertTriangle,
  Palette,
  Volume2,
  TrendingUp as Trending,
  Star,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BenchmarkRadarChart, BenchmarkBarChart } from '@/components/benchmark';
import { FavoriteButton, FavoriteSelector, FavoritesManager } from '@/components/favorites';
import { Favorite } from '@/hooks/useFavorites';

interface QualitativeAnalysis {
  publicationFrequency: string;
  contentTypes: string[];
  visualStyle: {
    description: string;
    characteristics: string[];
  };
  tonality: {
    description: string;
    characteristics: string[];
  };
  strengths: string[];
  weaknesses: string[];
  mainThemes: string[];
  audienceReaction: string;
  engagementRate: number;
}

interface PageData {
  pageName: string;
  pageUrl: string;
  followers: number;
  likes: number;
  about: string;
  category: string;
  posts: any[];
  error?: {
    code: string;
    message: string;
  };
}

interface CompetitorResult {
  pageData: PageData;
  qualitativeAnalysis: QualitativeAnalysis;
  quantitativeMetrics: {
    totalPosts: number;
    avgLikesPerPost: number;
    avgCommentsPerPost: number;
    avgSharesPerPost: number;
    postFrequencyPerMonth: number;
    engagementRate: number;
    topPostTypes: { type: string; count: number; percentage: number }[];
  };
  topPosts: any[];
}

interface FullBenchmarkReport {
  id: string;
  userId: number;
  createdAt: string;
  myPage: CompetitorResult | null;
  competitors: CompetitorResult[];
  comparativeAnalysis: {
    summary: string;
    rankings: {
      metric: string;
      rankings: { pageName: string; value: number; rank: number }[];
    }[];
    recommendations: string[];
  };
  creditsCost: number;
  status: string;
}

interface CostEstimate {
  estimatedCost: number;
  userBalance: number;
  canAfford: boolean;
  breakdown: {
    pages: number;
    postsPerPage: number;
    costPerPage: number;
    costPerPost: number;
    aiAnalysisCost: number;
    reportCost: number;
  };
}

interface BenchmarkConfig {
  myPageUrl: string;
  scrapePosts: boolean;
  scrapeComments: boolean;
  scrapePageInfo: boolean;
  postsLimit: number;
}

// Messages de progression pour le spinner
const PROGRESS_MESSAGES = [
  { step: 0, message: "Initialisation de l'analyse...", icon: "🔄" },
  { step: 1, message: "Connexion aux serveurs d'extraction...", icon: "🌐" },
  { step: 2, message: "Récupération des informations de page...", icon: "📄" },
  { step: 3, message: "Extraction des publications...", icon: "📝" },
  { step: 4, message: "Analyse des interactions...", icon: "💬" },
  { step: 5, message: "Traitement des données...", icon: "⚙️" },
  { step: 6, message: "Analyse qualitative IA...", icon: "🤖" },
  { step: 7, message: "Génération du rapport...", icon: "📊" },
  { step: 8, message: "Finalisation...", icon: "✅" },
];

interface BenchmarkHistoryItem {
  id: number;
  created_at: string;
  competitors: string[];
  creditsCost: number;
  myPageUrl?: string | null;
  myPageName?: string | null;
  competitorNames?: string[];
}

const BenchmarkPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingPage, setLoadingPage] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [report, setReport] = useState<FullBenchmarkReport | null>(null);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [activeTab, setActiveTab] = useState('config');
  const [history, setHistory] = useState<BenchmarkHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [config, setConfig] = useState<BenchmarkConfig>(() => {
    const refUrl = searchParams.get('ref') || '';
    return {
      myPageUrl: refUrl,
      scrapePosts: true,
      scrapeComments: true,
      scrapePageInfo: true,
      postsLimit: 20,
    };
  });
  const [showFavoritesManager, setShowFavoritesManager] = useState(false);

  // Charger l'historique des analyses
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await api.get('/benchmark/history');
      setHistory(response.data || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Simuler la progression pendant le chargement
  useEffect(() => {
    if (loading) {
      const totalPages = (config.myPageUrl ? 1 : 0) + competitors.length;
      const interval = setInterval(() => {
        setLoadingStep(prev => {
          if (prev < PROGRESS_MESSAGES.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 8000); // Changer de message toutes les 8 secondes
      
      return () => clearInterval(interval);
    } else {
      setLoadingStep(0);
      setLoadingPage('');
    }
  }, [loading]);

  const addCompetitor = () => {
    if (newCompetitor && !competitors.includes(newCompetitor)) {
      setCompetitors([...competitors, newCompetitor]);
      setNewCompetitor('');
      setCostEstimate(null);
    }
  };

  const removeCompetitor = (competitor: string) => {
    setCompetitors(competitors.filter(c => c !== competitor));
    setCostEstimate(null);
  };

  const estimateCost = async () => {
    if (competitors.length === 0) return;
    
    setEstimating(true);
    try {
      const response = await api.post('/benchmark/estimate', {
        myPageUrl: config.myPageUrl || null,
        competitors,
        postsLimit: config.postsLimit
      });
      setCostEstimate(response.data);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'estimer le coût',
        variant: 'destructive',
      });
    } finally {
      setEstimating(false);
    }
  };

  useEffect(() => {
    if (competitors.length > 0) {
      const timer = setTimeout(() => estimateCost(), 500);
      return () => clearTimeout(timer);
    }
  }, [competitors, config.myPageUrl, config.postsLimit]);

  const runFullBenchmark = async () => {
    if (competitors.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Ajoutez au moins une page concurrente',
        variant: 'destructive',
      });
      return;
    }

    if (costEstimate && !costEstimate.canAfford) {
      toast({
        title: 'Crédits insuffisants',
        description: `Vous avez besoin de ${costEstimate.estimatedCost} crédits mais vous n'en avez que ${costEstimate.userBalance}`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/benchmark/full', {
        myPageUrl: config.myPageUrl || null,
        competitors,
        options: {
          scrapePosts: config.scrapePosts,
          scrapeComments: config.scrapeComments,
          scrapePageInfo: config.scrapePageInfo,
          postsLimit: config.postsLimit,
        }
      });
      
      setReport(response.data);
      setActiveTab('overview');
      
      // Vérifier si des pages sont protégées
      const allPages = [response.data.myPage, ...response.data.competitors].filter(Boolean);
      const protectedPages = allPages.filter((p: any) => p.pageData?.error);
      const successfulPages = allPages.length - protectedPages.length;
      
      if (protectedPages.length > 0) {
        toast({
          title: '⚠️ Analyse terminée avec avertissements',
          description: `${successfulPages}/${allPages.length} pages analysées. ${protectedPages.length} page(s) protégée(s) ou inaccessible(s): ${protectedPages.map((p: any) => p.pageData.pageName).join(', ')}. ${response.data.creditsCost} crédits utilisés.`,
          variant: 'default',
          duration: 8000,
        });
      } else {
        toast({
          title: '✅ Analyse terminée',
          description: `Rapport généré avec succès. ${response.data.creditsCost} crédits utilisés.`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Erreur lors de l\'analyse',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getAllPages = (): CompetitorResult[] => {
    if (!report) return [];
    const pages: CompetitorResult[] = [];
    if (report.myPage) pages.push(report.myPage);
    pages.push(...report.competitors);
    return pages;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Générer un graphique barres SVG pour le PDF
  const generateBarChartSVG = (data: { name: string; value: number; color: string }[], title: string, maxWidth: number = 500) => {
    const maxValue = Math.max(...data.map(d => d.value));
    const barHeight = 30;
    const gap = 10;
    const labelWidth = 120;
    const chartHeight = data.length * (barHeight + gap);
    
    const bars = data.map((d, i) => {
      const barWidth = maxValue > 0 ? (d.value / maxValue) * (maxWidth - labelWidth - 60) : 0;
      const y = i * (barHeight + gap);
      return `
        <g transform="translate(0, ${y})">
          <text x="0" y="${barHeight / 2 + 4}" font-size="11" fill="#374151">${d.name.substring(0, 15)}${d.name.length > 15 ? '...' : ''}</text>
          <rect x="${labelWidth}" y="0" width="${barWidth}" height="${barHeight}" fill="${d.color}" rx="4"/>
          <text x="${labelWidth + barWidth + 8}" y="${barHeight / 2 + 4}" font-size="11" fill="#6366f1" font-weight="bold">${d.value.toLocaleString()}</text>
        </g>
      `;
    }).join('');

    return `
      <div style="margin: 20px 0;">
        <h4 style="color: #374151; margin-bottom: 10px;">${title}</h4>
        <svg width="${maxWidth}" height="${chartHeight}" viewBox="0 0 ${maxWidth} ${chartHeight}">
          ${bars}
        </svg>
      </div>
    `;
  };

  // Générer un graphique comparatif multi-métriques pour le PDF
  const generateComparisonChartSVG = (pages: CompetitorResult[]) => {
    const metrics = [
      { key: 'followers', label: 'Followers', color: '#3b82f6' },
      { key: 'avgLikesPerPost', label: 'Likes Moy.', color: '#10b981' },
      { key: 'avgCommentsPerPost', label: 'Comments Moy.', color: '#8b5cf6' },
      { key: 'engagementRate', label: 'Engagement %', color: '#f59e0b' },
    ];

    return metrics.map(metric => {
      const data = pages.map((p, i) => ({
        name: p.pageData.pageName,
        value: metric.key === 'followers' ? p.pageData.followers : 
               metric.key === 'avgLikesPerPost' ? p.quantitativeMetrics.avgLikesPerPost :
               metric.key === 'avgCommentsPerPost' ? p.quantitativeMetrics.avgCommentsPerPost :
               p.quantitativeMetrics.engagementRate,
        color: COLORS[i % COLORS.length]
      }));
      return generateBarChartSVG(data, metric.label, 450);
    }).join('');
  };

  // Export PDF complet - Version Corporate
  const exportPDF = async () => {
    if (!report) return;

    try {
      const allPages = getAllPages();
      const dateGeneration = format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr });
      const avgEngagement = allPages.length > 0 ? (allPages.reduce((sum, p) => sum + p.quantitativeMetrics.engagementRate, 0) / allPages.length).toFixed(2) : 0;
      const totalFollowers = allPages.reduce((sum, p) => sum + p.pageData.followers, 0);
      const totalPosts = allPages.reduce((sum, p) => sum + p.quantitativeMetrics.totalPosts, 0);
      
      const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport Benchmark Concurrentiel - Easy</title>
  <style>
    @page { margin: 15mm; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; background: #fff; color: #1f2937; padding: 0; line-height: 1.5; font-size: 11px; }
    
    /* Header Corporate */
    .cover { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 40px; text-align: center; margin-bottom: 30px; }
    .cover h1 { font-size: 32px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.5px; }
    .cover .subtitle { font-size: 16px; opacity: 0.9; margin-bottom: 20px; }
    .cover .meta { display: flex; justify-content: center; gap: 30px; font-size: 12px; opacity: 0.85; }
    .cover .meta-item { display: flex; align-items: center; gap: 6px; }
    .logo { font-size: 14px; font-weight: 700; margin-bottom: 15px; letter-spacing: 1px; }
    
    /* Sections */
    .content { padding: 0 30px; }
    .section { margin-bottom: 25px; page-break-inside: avoid; }
    .section-title { font-size: 16px; font-weight: 700; color: #f97316; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #fed7aa; display: flex; align-items: center; gap: 8px; }
    .section-title::before { content: ''; width: 4px; height: 20px; background: #f97316; border-radius: 2px; }
    
    /* Executive Summary */
    .exec-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
    .exec-card { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 15px; text-align: center; }
    .exec-card .value { font-size: 28px; font-weight: 700; color: #ea580c; }
    .exec-card .label { font-size: 10px; color: #9a3412; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    
    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
    th { background: #f97316; color: white; padding: 10px 8px; text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
    td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    tr:nth-child(even) { background: #fafafa; }
    tr:hover { background: #fff7ed; }
    
    /* Page Analysis Cards */
    .page-card { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
    .page-name { font-size: 14px; font-weight: 700; color: #1f2937; }
    .page-badge { background: #10b981; color: white; padding: 3px 10px; border-radius: 12px; font-size: 9px; font-weight: 600; }
    .page-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px; }
    .page-metric { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; text-align: center; }
    .page-metric .value { font-size: 16px; font-weight: 700; color: #f97316; }
    .page-metric .label { font-size: 9px; color: #6b7280; }
    
    /* AI Analysis */
    .ai-analysis { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin-top: 15px; }
    .ai-analysis h4 { font-size: 11px; font-weight: 700; color: #92400e; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
    .ai-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .ai-item { background: white; border-radius: 6px; padding: 10px; }
    .ai-item .title { font-size: 9px; font-weight: 600; color: #92400e; text-transform: uppercase; margin-bottom: 4px; }
    .ai-item .content { font-size: 10px; color: #1f2937; }
    
    /* Strengths & Weaknesses */
    .sw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
    .sw-box { border-radius: 8px; padding: 12px; }
    .sw-box.strengths { background: #ecfdf5; border: 1px solid #a7f3d0; }
    .sw-box.weaknesses { background: #fef2f2; border: 1px solid #fecaca; }
    .sw-box h5 { font-size: 10px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 4px; }
    .sw-box.strengths h5 { color: #065f46; }
    .sw-box.weaknesses h5 { color: #991b1b; }
    .sw-box ul { padding-left: 15px; margin: 0; }
    .sw-box li { font-size: 10px; margin-bottom: 4px; color: #374151; }
    
    /* Rankings */
    .ranking-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .ranking-card { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .ranking-card h4 { font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 10px; }
    .ranking-item { display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
    .ranking-item:last-child { border-bottom: none; }
    .rank-badge { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; margin-right: 10px; }
    .rank-1 { background: #fbbf24; color: #1f2937; }
    .rank-2 { background: #9ca3af; color: white; }
    .rank-3 { background: #cd7f32; color: white; }
    .rank-other { background: #e5e7eb; color: #6b7280; }
    .ranking-name { flex: 1; font-size: 10px; }
    .ranking-value { font-weight: 700; color: #f97316; font-size: 10px; }
    
    /* Recommendations */
    .recommendation { background: linear-gradient(90deg, #fff7ed 0%, #ffffff 100%); border-left: 4px solid #f97316; padding: 12px 15px; margin-bottom: 10px; border-radius: 0 6px 6px 0; }
    .recommendation .number { display: inline-block; background: #f97316; color: white; width: 20px; height: 20px; border-radius: 50%; text-align: center; line-height: 20px; font-size: 10px; font-weight: 700; margin-right: 10px; }
    .recommendation .text { font-size: 11px; color: #1f2937; }
    
    /* Top Posts */
    .top-post { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 8px; }
    .top-post .text { font-size: 10px; color: #374151; margin-bottom: 8px; line-height: 1.4; }
    .top-post .stats { display: flex; gap: 15px; font-size: 9px; color: #6b7280; }
    .top-post .stat { display: flex; align-items: center; gap: 4px; }
    .top-post .stat.likes { color: #3b82f6; }
    .top-post .stat.comments { color: #8b5cf6; }
    .top-post .stat.shares { color: #10b981; }
    
    /* Charts Section */
    .charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .chart-container { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
    .chart-title { font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 10px; }
    
    /* Footer */
    .footer { margin-top: 40px; padding: 20px 30px; background: #1f2937; color: white; text-align: center; }
    .footer .brand { font-size: 14px; font-weight: 700; color: #f97316; margin-bottom: 5px; }
    .footer .tagline { font-size: 10px; opacity: 0.7; }
    .footer .legal { font-size: 9px; opacity: 0.5; margin-top: 10px; }
    
    /* Print optimizations */
    @media print { 
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section { page-break-inside: avoid; }
      .page-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover">
    <div class="logo">EASY</div>
    <h1>Rapport Benchmark Concurrentiel</h1>
    <div class="subtitle">Analyse comparative des performances sur les réseaux sociaux</div>
    <div class="meta">
      <div class="meta-item">📅 ${dateGeneration}</div>
      <div class="meta-item">📄 ${allPages.length} pages analysées</div>
    </div>
  </div>

  <div class="content">
    <!-- Executive Summary -->
    <div class="section">
      <div class="section-title">Résumé Exécutif</div>
      <div class="exec-summary">
        <div class="exec-card">
          <div class="value">${allPages.length}</div>
          <div class="label">Pages analysées</div>
        </div>
        <div class="exec-card">
          <div class="value">${totalPosts}</div>
          <div class="label">Posts analysés</div>
        </div>
        <div class="exec-card">
          <div class="value">${totalFollowers.toLocaleString()}</div>
          <div class="label">Followers total</div>
        </div>
        <div class="exec-card">
          <div class="value">${avgEngagement}%</div>
          <div class="label">Engagement moyen</div>
        </div>
      </div>
      ${report.comparativeAnalysis.summary ? `<p style="font-size: 11px; color: #4b5563; background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 3px solid #f97316;">${report.comparativeAnalysis.summary}</p>` : ''}
    </div>

    <!-- Quantitative Metrics Table -->
    <div class="section">
      <div class="section-title">Métriques Quantitatives</div>
      <table>
        <thead>
          <tr>
            <th>Page</th>
            <th style="text-align:right">Followers</th>
            <th style="text-align:right">Posts</th>
            <th style="text-align:right">Likes Moy.</th>
            <th style="text-align:right">Comments Moy.</th>
            <th style="text-align:right">Partages Moy.</th>
            <th style="text-align:right">Engagement</th>
            <th style="text-align:right">Fréquence</th>
          </tr>
        </thead>
        <tbody>
          ${allPages.map((page) => `
            <tr>
              <td><strong>${page.pageData.pageName}</strong>${report.myPage && page.pageData.pageUrl === report.myPage.pageData.pageUrl ? ' <span class="page-badge">Référence</span>' : ''}</td>
              <td style="text-align:right">${page.pageData.followers.toLocaleString()}</td>
              <td style="text-align:right">${page.quantitativeMetrics.totalPosts}</td>
              <td style="text-align:right">${page.quantitativeMetrics.avgLikesPerPost}</td>
              <td style="text-align:right">${page.quantitativeMetrics.avgCommentsPerPost}</td>
              <td style="text-align:right">${page.quantitativeMetrics.avgSharesPerPost}</td>
              <td style="text-align:right; font-weight:600; color:#f97316">${page.quantitativeMetrics.engagementRate}%</td>
              <td style="text-align:right">${page.quantitativeMetrics.postFrequencyPerMonth}/mois</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Charts -->
    <div class="section">
      <div class="section-title">Graphiques Comparatifs</div>
      <div class="charts-grid">
        ${generateComparisonChartSVG(allPages.filter(p => !p.pageData.error))}
      </div>
    </div>

    <!-- Rankings -->
    <div class="section">
      <div class="section-title">Classements par Métrique</div>
      <div class="ranking-grid">
        ${report.comparativeAnalysis.rankings.map(ranking => `
          <div class="ranking-card">
            <h4>${ranking.metric}</h4>
            ${ranking.rankings.map((item, idx) => `
              <div class="ranking-item">
                <div class="rank-badge rank-${idx < 3 ? idx + 1 : 'other'}">${item.rank}</div>
                <div class="ranking-name">${item.pageName}</div>
                <div class="ranking-value">${typeof item.value === 'number' && item.value % 1 !== 0 ? item.value.toFixed(2) : item.value}${ranking.metric.includes('Engagement') ? '%' : ''}</div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Detailed Analysis per Page -->
    <div class="section">
      <div class="section-title">Analyse Détaillée par Page (IA)</div>
      ${allPages.map((page) => `
        <div class="page-card">
          <div class="page-header">
            <div class="page-name">${page.pageData.pageName}</div>
            ${report.myPage && page.pageData.pageUrl === report.myPage.pageData.pageUrl ? '<span class="page-badge">Votre page</span>' : ''}
          </div>
          
          <div class="page-metrics">
            <div class="page-metric">
              <div class="value">${page.pageData.followers.toLocaleString()}</div>
              <div class="label">Followers</div>
            </div>
            <div class="page-metric">
              <div class="value">${page.quantitativeMetrics.engagementRate}%</div>
              <div class="label">Taux d'engagement</div>
            </div>
            <div class="page-metric">
              <div class="value">${page.quantitativeMetrics.postFrequencyPerMonth}</div>
              <div class="label">Posts/mois</div>
            </div>
          </div>

          <div class="ai-analysis">
            <h4>🤖 Analyse IA de la Stratégie de Contenu</h4>
            <div class="ai-grid">
              <div class="ai-item">
                <div class="title">📅 Fréquence de publication</div>
                <div class="content">${page.qualitativeAnalysis.publicationFrequency}</div>
              </div>
              <div class="ai-item">
                <div class="title">📝 Types de contenu</div>
                <div class="content">${page.qualitativeAnalysis.contentTypes.join(', ')}</div>
              </div>
              <div class="ai-item">
                <div class="title">🎨 Style visuel</div>
                <div class="content">${page.qualitativeAnalysis.visualStyle.description}</div>
                ${page.qualitativeAnalysis.visualStyle.characteristics?.length ? `<ul style="margin-top:4px;padding-left:14px;font-size:9px;color:#6b7280">${page.qualitativeAnalysis.visualStyle.characteristics.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}
              </div>
              <div class="ai-item">
                <div class="title">🎤 Tonalité</div>
                <div class="content">${page.qualitativeAnalysis.tonality.description}</div>
                ${page.qualitativeAnalysis.tonality.characteristics?.length ? `<ul style="margin-top:4px;padding-left:14px;font-size:9px;color:#6b7280">${page.qualitativeAnalysis.tonality.characteristics.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}
              </div>
              <div class="ai-item">
                <div class="title">🎯 Thématiques principales</div>
                <div class="content">${page.qualitativeAnalysis.mainThemes.join(', ')}</div>
              </div>
              <div class="ai-item">
                <div class="title">👥 Réaction du public</div>
                <div class="content">${page.qualitativeAnalysis.audienceReaction}</div>
              </div>
            </div>
          </div>

          <div class="sw-grid">
            <div class="sw-box strengths">
              <h5>✅ Forces identifiées</h5>
              <ul>
                ${page.qualitativeAnalysis.strengths.map(s => `<li>${s}</li>`).join('')}
              </ul>
            </div>
            <div class="sw-box weaknesses">
              <h5>⚠️ Points d'amélioration</h5>
              <ul>
                ${page.qualitativeAnalysis.weaknesses.map(w => `<li>${w}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Top Posts -->
    <div class="section">
      <div class="section-title">Top Posts Performants</div>
      ${allPages.map(page => `
        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 10px; padding-left: 8px; border-left: 3px solid #f97316;">${page.pageData.pageName}</h4>
          ${page.topPosts.slice(0, 3).map((post: any) => `
            <div class="top-post">
              <div class="text">${(post.text || 'Publication sans texte').substring(0, 200)}${post.text?.length > 200 ? '...' : ''}</div>
              <div class="stats">
                <span class="stat likes">👍 ${post.likes?.toLocaleString() || 0} likes</span>
                <span class="stat comments">💬 ${post.comments?.toLocaleString() || 0} commentaires</span>
                <span class="stat shares">🔄 ${post.shares?.toLocaleString() || 0} partages</span>
                ${post.postedAt ? `<span class="stat">📅 ${format(new Date(post.postedAt), 'dd/MM/yyyy', { locale: fr })}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>

    <!-- Comparatif Détaillé -->
    <div class="section" style="page-break-before: always;">
      <div class="section-title">Comparatif Détaillé</div>
      <table>
        <thead>
          <tr>
            <th>Page</th>
            <th style="text-align:right">Followers</th>
            <th style="text-align:right">Likes/post</th>
            <th style="text-align:right">Comments/post</th>
            <th style="text-align:right">Partages/post</th>
            <th style="text-align:right">Engagement %</th>
            <th style="text-align:right">Posts/mois</th>
          </tr>
        </thead>
        <tbody>
          ${[...allPages].sort((a, b) => b.quantitativeMetrics.engagementRate - a.quantitativeMetrics.engagementRate).map((page, idx) => {
            const isRef = report.myPage && page.pageData.pageUrl === report.myPage.pageData.pageUrl;
            return `
            <tr style="${isRef ? 'background:#ecfdf5;font-weight:600;' : ''}">
              <td>${page.pageData.pageName}${isRef ? ' <span class="page-badge">Réf.</span>' : ''}</td>
              <td style="text-align:right">${page.pageData.followers.toLocaleString()}</td>
              <td style="text-align:right">${page.quantitativeMetrics.avgLikesPerPost}</td>
              <td style="text-align:right">${page.quantitativeMetrics.avgCommentsPerPost}</td>
              <td style="text-align:right">${page.quantitativeMetrics.avgSharesPerPost}</td>
              <td style="text-align:right;color:#f97316;font-weight:700">${page.quantitativeMetrics.engagementRate}%</td>
              <td style="text-align:right">${page.quantitativeMetrics.postFrequencyPerMonth}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      ${(() => {
        const avgFollowers = allPages.length ? Math.round(allPages.reduce((s, p) => s + p.pageData.followers, 0) / allPages.length) : 0;
        const avgEngRate = allPages.length ? (allPages.reduce((s, p) => s + p.quantitativeMetrics.engagementRate, 0) / allPages.length).toFixed(2) : '0';
        const avgLikes = allPages.length ? Math.round(allPages.reduce((s, p) => s + p.quantitativeMetrics.avgLikesPerPost, 0) / allPages.length) : 0;
        return `<p style="font-size:10px;color:#6b7280;margin-top:8px;">Moyennes du panel : ${avgFollowers.toLocaleString()} followers, ${avgEngRate}% engagement, ${avgLikes} likes/post</p>`;
      })()}
    </div>

    <!-- Recommendations -->
    <div class="section">
      <div class="section-title">Recommandations Stratégiques</div>
      ${report.comparativeAnalysis.recommendations.map((rec, idx) => `
        <div class="recommendation">
          <span class="number">${idx + 1}</span>
          <span class="text">${rec}</span>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="brand">EASY</div>
    <div class="tagline">Intelligence Sociale & Veille Concurrentielle</div>
    <div class="legal">© ${new Date().getFullYear()} Easy - Rapport généré automatiquement - Tous droits réservés</div>
  </div>
</body>
</html>`;

      // Ouvrir dans une nouvelle fenêtre pour impression/PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Attendre le chargement puis lancer l'impression
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }

      toast({
        title: 'Export PDF',
        description: 'Le rapport s\'ouvre dans une nouvelle fenêtre. Utilisez Ctrl+P ou Cmd+P pour sauvegarder en PDF.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le PDF',
        variant: 'destructive',
      });
    }
  };

  // Export des posts bruts en JSON
  const exportRawData = () => {
    if (!report) return;

    try {
      const allPages = getAllPages();
      const exportData = {
        exportDate: new Date().toISOString(),
        pages: allPages.map(page => ({
          pageName: page.pageData.pageName,
          pageUrl: page.pageData.pageUrl,
          followers: page.pageData.followers,
          category: page.pageData.category,
          about: page.pageData.about,
          metrics: page.quantitativeMetrics,
          posts: page.pageData.posts.map((post: any) => ({
            id: post.id,
            text: post.text,
            likes: post.likes,
            comments: post.comments,
            shares: post.shares,
            postedAt: post.postedAt,
            type: post.type,
            url: post.url,
            mediaUrl: post.mediaUrl
          })),
          topPosts: page.topPosts,
          qualitativeAnalysis: page.qualitativeAnalysis
        })),
        comparativeAnalysis: report.comparativeAnalysis
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `benchmark_data_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export réussi',
        description: 'Les données brutes ont été téléchargées en JSON.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter les données',
        variant: 'destructive',
      });
    }
  };

  // Export CSV des posts
  const exportPostsCSV = () => {
    if (!report) return;

    try {
      const allPages = getAllPages();
      const headers = ['Page', 'Post ID', 'Texte', 'Likes', 'Comments', 'Shares', 'Date', 'Type', 'URL'];
      const rows: string[][] = [];

      allPages.forEach(page => {
        page.pageData.posts.forEach((post: any) => {
          rows.push([
            page.pageData.pageName,
            post.id || '',
            (post.text || '').replace(/"/g, '""').replace(/\n/g, ' '),
            String(post.likes || 0),
            String(post.comments || 0),
            String(post.shares || 0),
            post.postedAt || '',
            post.type || '',
            post.url || ''
          ]);
        });
      });

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `benchmark_posts_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export réussi',
        description: 'Les posts ont été téléchargés en CSV.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter les posts',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 p-4 sm:p-6 space-y-4 sm:space-y-6 pt-14 md:pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">Benchmark Concurrentiel</h1>
          <p className="text-steel mt-1 text-sm sm:text-base">Analyse complète avec collecte et rapport IA</p>
        </div>
        <Badge className="bg-steel-100 text-steel-700 border-steel-200 flex items-center gap-2 w-fit">
          <Activity className="w-4 h-4" />
          <span className="hidden sm:inline">Analyse IA Avancée</span>
          <span className="sm:hidden">IA</span>
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap sm:grid sm:w-full sm:grid-cols-4 lg:grid-cols-7 bg-white border border-cream-300 rounded-lg p-1 shadow-sm gap-1">
          <TabsTrigger value="config" className="data-[state=active]:bg-gold data-[state=active]:text-white text-steel rounded-md">
            <Settings className="w-4 h-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-gold data-[state=active]:text-white text-steel rounded-md">
            <Clock className="w-4 h-4 mr-2" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="overview" className="data-[state=active]:bg-gold data-[state=active]:text-white text-steel rounded-md" disabled={!report}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="charts" className="data-[state=active]:bg-gold data-[state=active]:text-white text-steel rounded-md" disabled={!report}>
            <Activity className="w-4 h-4 mr-2" />
            Graphiques
          </TabsTrigger>
          <TabsTrigger value="qualitative" className="data-[state=active]:bg-gold data-[state=active]:text-white text-steel rounded-md" disabled={!report}>
            <Palette className="w-4 h-4 mr-2" />
            Analyse Qualitative
          </TabsTrigger>
          <TabsTrigger value="comparison" className="data-[state=active]:bg-gold data-[state=active]:text-white text-steel rounded-md" disabled={!report}>
            <Trending className="w-4 h-4 mr-2" />
            Comparatif
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="data-[state=active]:bg-gold data-[state=active]:text-white text-steel rounded-md" disabled={!report}>
            <Zap className="w-4 h-4 mr-2" />
            Recommandations
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4 mt-4">
          {/* Analysis Options */}
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader>
              <CardTitle className="text-navy flex items-center gap-2">
                <Settings className="w-5 h-5 text-gold" />
                Options d'analyse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all bg-cream-50 ${config.scrapePosts ? 'border-gold-300 bg-gold-50' : 'border-cream-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.scrapePosts ? 'bg-gold-100' : 'bg-cream-100'}`}>
                      <FileText className={`w-5 h-5 ${config.scrapePosts ? 'text-gold-600' : 'text-steel-200'}`} />
                    </div>
                    <div>
                      <Label className="font-medium text-navy">
                        Extraire les posts
                      </Label>
                      <p className="text-xs text-steel">Publications de la page</p>
                    </div>
                  </div>
                  <Switch 
                    checked={config.scrapePosts}
                    onCheckedChange={(checked) => setConfig({...config, scrapePosts: checked})}
                  />
                </div>
                
                <div 
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all bg-cream-50 ${config.scrapeComments ? 'border-gold-300 bg-gold-50' : 'border-cream-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.scrapeComments ? 'bg-gold-100' : 'bg-cream-100'}`}>
                      <MessageSquare className={`w-5 h-5 ${config.scrapeComments ? 'text-gold-600' : 'text-steel-200'}`} />
                    </div>
                    <div>
                      <Label className="font-medium text-navy">
                        Extraire les commentaires
                      </Label>
                      <p className="text-xs text-steel">Analyse du sentiment</p>
                    </div>
                  </div>
                  <Switch 
                    checked={config.scrapeComments}
                    onCheckedChange={(checked) => setConfig({...config, scrapeComments: checked})}
                  />
                </div>
                
                <div 
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all bg-cream-50 ${config.scrapePageInfo ? 'border-gold-300 bg-gold-50' : 'border-cream-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.scrapePageInfo ? 'bg-gold-100' : 'bg-cream-100'}`}>
                      <Building2 className={`w-5 h-5 ${config.scrapePageInfo ? 'text-gold-600' : 'text-steel-200'}`} />
                    </div>
                    <div>
                      <Label className="font-medium text-navy">
                        Infos de la page
                      </Label>
                      <p className="text-xs text-steel">Followers, likes, etc.</p>
                    </div>
                  </div>
                  <Switch 
                    checked={config.scrapePageInfo}
                    onCheckedChange={(checked) => setConfig({...config, scrapePageInfo: checked})}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-navy-700">Nombre de posts à analyser par page: {config.postsLimit}</Label>
                <Slider
                  value={[config.postsLimit]}
                  onValueChange={(value) => setConfig({...config, postsLimit: value[0]})}
                  min={5}
                  max={50}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-steel">Plus de posts = analyse plus complète mais coût plus élevé</p>
              </div>
            </CardContent>
          </Card>

          {/* My Page */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-navy flex items-center gap-2">
                <Crown className="w-5 h-5 text-green-400" />
                Ma Page (Référence)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="https://www.facebook.com/votre-page"
                value={config.myPageUrl}
                onChange={(e) => setConfig({...config, myPageUrl: e.target.value})}
                className="bg-white border-cream-300 text-navy placeholder:text-steel-200"
              />
              <p className="text-xs text-steel mt-2">Optionnel - Laissez vide pour utiliser vos données existantes</p>
            </CardContent>
          </Card>

          {/* Competitors */}
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-navy flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-gold" />
                  Pages Concurrentes à Analyser
                </CardTitle>
                <FavoriteSelector
                  type="benchmark"
                  onSelect={(favorite: Favorite) => {
                    if (!competitors.includes(favorite.url)) {
                      setCompetitors([...competitors, favorite.url]);
                      setCostEstimate(null);
                      toast({
                        title: "⭐ Favori chargé",
                        description: `"${favorite.name}" ajouté aux concurrents`,
                      });
                    }
                  }}
                  onManageClick={() => setShowFavoritesManager(true)}
                  placeholder="Charger un favori"
                  className="h-8 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="https://www.facebook.com/page-concurrent"
                    value={newCompetitor}
                    onChange={(e) => setNewCompetitor(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCompetitor()}
                    className="bg-white border-cream-300 text-navy placeholder:text-steel-200 pr-10"
                  />
                  {newCompetitor.trim() && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <FavoriteButton
                        url={newCompetitor}
                        type="benchmark"
                        defaultName={newCompetitor.replace(/https?:\/\/(www\.)?facebook\.com\/?/i, '').split('/')[0] || 'Page Benchmark'}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
                <Button onClick={addCompetitor} disabled={!newCompetitor} className="bg-gold-600 hover:bg-gold-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>

              {competitors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-navy-700">Pages à analyser ({competitors.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {competitors.map((competitor, index) => (
                      <Badge key={index} className="bg-gold-100 text-gold-700 border-gold-200 flex items-center gap-2 px-3 py-1.5">
                        <Building2 className="w-3 h-3" />
                        {truncateText(competitor.replace(/https?:\/\/(www\.)?facebook\.com\/?/i, ''), 25)}
                        <FavoriteButton
                          url={competitor}
                          type="benchmark"
                          defaultName={competitor.replace(/https?:\/\/(www\.)?facebook\.com\/?/i, '').split('/')[0] || 'Page'}
                          size="sm"
                          className="ml-1"
                        />
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-red-400"
                          onClick={() => removeCompetitor(competitor)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Estimate */}
          {costEstimate && (
            <Card className={`border ${costEstimate.canAfford ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-navy flex items-center gap-2">
                  <Coins className={`w-5 h-5 ${costEstimate.canAfford ? 'text-green-400' : 'text-red-400'}`} />
                  Estimation du coût
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-steel-50 rounded-lg border border-steel-200">
                    <div className="text-2xl font-bold text-steel-600">{costEstimate.estimatedCost}</div>
                    <div className="text-xs text-steel">Crédits requis</div>
                  </div>
                  <div className="text-center p-3 bg-navy-50 rounded-lg border border-navy-200">
                    <div className="text-2xl font-bold text-navy">{costEstimate.userBalance}</div>
                    <div className="text-xs text-steel">Votre solde</div>
                  </div>
                  <div className="text-center p-3 bg-cream-50 rounded-lg border border-cream-300">
                    <div className="text-2xl font-bold text-navy-700">{costEstimate.breakdown.pages}</div>
                    <div className="text-xs text-steel">Pages à scraper</div>
                  </div>
                  <div className="text-center p-3 bg-cream-50 rounded-lg border border-cream-300">
                    <div className="text-2xl font-bold text-navy-700">{costEstimate.breakdown.pages * costEstimate.breakdown.postsPerPage}</div>
                    <div className="text-xs text-steel">Posts max</div>
                  </div>
                </div>
                
                {!costEstimate.canAfford && (
                  <div className="mt-4 p-3 bg-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Crédits insuffisants. Vous avez besoin de {costEstimate.estimatedCost - costEstimate.userBalance} crédits supplémentaires.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Launch Button */}
          <Button
            onClick={runFullBenchmark}
            disabled={loading || competitors.length === 0 || (costEstimate && !costEstimate.canAfford)}
            className="w-full bg-gold hover:bg-gold-600 h-14 text-lg"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <BarChart3 className="w-5 h-5 mr-2" />
                Lancer l'Analyse Benchmark Complète
                {costEstimate && <span className="ml-2 text-steel-200">({costEstimate.estimatedCost} crédits)</span>}
              </>
            )}
          </Button>

          {/* Loading Progress Modal */}
          {loading && (
            <Card className="bg-white border-cream-300 shadow-sm overflow-hidden">
              <CardContent className="py-8">
                <div className="text-center space-y-6">
                  {/* Animated spinner */}
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 border-4 border-cream-300 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-steel-500 border-r-steel/50 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-steel-400 animate-pulse" />
                    </div>
                  </div>

                  {/* Progress message */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-navy">
                      {PROGRESS_MESSAGES[loadingStep]?.message || 'Analyse en cours...'}
                    </h3>
                    <p className="text-steel text-sm">
                      Analyse de {(config.myPageUrl ? 1 : 0) + competitors.length} page(s) Facebook
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="max-w-md mx-auto space-y-2">
                    <div className="h-2 bg-navy rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-steel-600 to-steel-400 transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${(loadingStep / (PROGRESS_MESSAGES.length - 1)) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-steel">
                      <span>Étape {loadingStep + 1}/{PROGRESS_MESSAGES.length}</span>
                      <span>~{Math.max(1, (PROGRESS_MESSAGES.length - loadingStep) * 10)}s restantes</span>
                    </div>
                  </div>

                  {/* Pages being processed */}
                  <div className="max-w-lg mx-auto">
                    <p className="text-xs text-steel mb-3">Pages en cours d'analyse:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {config.myPageUrl && (
                        <Badge className="bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-1">
                          <Crown className="w-3 h-3 mr-1.5" />
                          {truncateText(config.myPageUrl.replace(/https?:\/\/(www\.)?facebook\.com\/?/i, ''), 20)}
                        </Badge>
                      )}
                      {competitors.map((comp, idx) => (
                        <Badge key={idx} className="bg-gold/10 text-gold-400 border border-gold/30 px-3 py-1">
                          <Building2 className="w-3 h-3 mr-1.5" />
                          {truncateText(comp.replace(/https?:\/\/(www\.)?facebook\.com\/?/i, ''), 20)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-steel text-sm">
                      <span className="text-steel-400 font-medium">💡 Conseil:</span> L'analyse peut prendre 1-2 minutes par page. 
                      Veuillez patienter pendant l'extraction des données.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-navy flex items-center gap-2">
                  <Clock className="w-5 h-5 text-steel-500" />
                  Historique des analyses
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadHistory}
                  disabled={loadingHistory}
                  className="border-cream-300 text-navy-700 hover:bg-cream-100"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
              </div>
              <CardDescription className="text-steel">
                Retrouvez vos analyses benchmark précédentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-steel-400 animate-spin" />
                  <span className="ml-2 text-steel-200">Chargement...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-steel mx-auto mb-3" />
                  <p className="text-steel-200">Aucune analyse benchmark pour le moment</p>
                  <p className="text-steel text-sm mt-1">Lancez votre première analyse dans l'onglet Configuration</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-4 bg-cream-50 rounded-lg border border-cream-300 hover:border-gold-300 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-steel-500/20 rounded-lg">
                          <BarChart3 className="w-5 h-5 text-steel-400" />
                        </div>
                        <div>
                          <p className="text-navy font-medium">
                            Analyse du {format(new Date(item.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                          </p>
                          {item.myPageName || (item.competitorNames && item.competitorNames.length > 0) ? (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {item.myPageName && (
                                <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                  {item.myPageName} (Réf.)
                                </span>
                              )}
                              {item.competitorNames?.map((name, idx) => (
                                <span key={idx} className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-cream-200 text-steel">
                                  {name}
                                </span>
                              ))}
                              <span className="text-xs text-steel ml-1">• {item.creditsCost || 0} crédits</span>
                            </div>
                          ) : (
                            <p className="text-steel text-sm">
                              {item.competitors?.length || 0} page(s) analysée(s) • {item.creditsCost || 0} crédits
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-gold hover:bg-gold-600 text-white"
                          onClick={async () => {
                            try {
                              const response = await api.get(`/benchmark/${item.id}`);
                              setReport(response.data);
                              setActiveTab('overview');
                              toast({ title: 'Rapport chargé', description: 'Le rapport a été chargé avec succès.' });
                            } catch (error) {
                              toast({ title: 'Erreur', description: 'Impossible de charger le rapport', variant: 'destructive' });
                            }
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500 text-green-600 hover:bg-green-50"
                          onClick={async () => {
                            try {
                              const response = await api.get(`/benchmark/${item.id}`);
                              const data = response.data;
                              
                              // Créer le contenu CSV/Excel
                              let csvContent = '\uFEFF'; // BOM pour UTF-8
                              csvContent += 'RAPPORT BENCHMARK - ' + format(new Date(item.created_at), 'dd/MM/yyyy HH:mm') + '\n\n';
                              
                              // Section Pages
                              csvContent += 'PAGES ANALYSÉES\n';
                              csvContent += 'Nom;URL;Followers;Likes;Catégorie;Posts;Engagement\n';
                              
                              const allPages = [...(data.myPage ? [data.myPage] : []), ...(data.competitors || [])];
                              allPages.forEach((page: any) => {
                                csvContent += `"${page.pageData?.pageName || 'N/A'}";"${page.pageData?.pageUrl || ''}";"${page.pageData?.followers || 0}";"${page.pageData?.likes || 0}";"${page.pageData?.category || ''}";"${page.quantitativeMetrics?.totalPosts || 0}";"${page.quantitativeMetrics?.engagementRate || 0}%"\n`;
                              });
                              
                              csvContent += '\nMÉTRIQUES DÉTAILLÉES\n';
                              csvContent += 'Page;Likes Moyens;Commentaires Moyens;Partages Moyens;Fréquence/Mois\n';
                              allPages.forEach((page: any) => {
                                csvContent += `"${page.pageData?.pageName || 'N/A'}";"${page.quantitativeMetrics?.avgLikesPerPost || 0}";"${page.quantitativeMetrics?.avgCommentsPerPost || 0}";"${page.quantitativeMetrics?.avgSharesPerPost || 0}";"${page.quantitativeMetrics?.postFrequencyPerMonth || 0}"\n`;
                              });
                              
                              // Top Posts
                              csvContent += '\nTOP POSTS\n';
                              csvContent += 'Page;Texte;Likes;Commentaires;Partages;Date\n';
                              allPages.forEach((page: any) => {
                                (page.topPosts || []).slice(0, 5).forEach((post: any) => {
                                  const text = (post.text || '').replace(/"/g, '""').substring(0, 100);
                                  csvContent += `"${page.pageData?.pageName || ''}";"${text}";"${post.likes || 0}";"${post.comments || 0}";"${post.shares || 0}";"${post.postedAt || ''}"\n`;
                                });
                              });
                              
                              // Recommandations
                              if (data.comparativeAnalysis?.recommendations) {
                                csvContent += '\nRECOMMANDATIONS\n';
                                data.comparativeAnalysis.recommendations.forEach((rec: string, i: number) => {
                                  csvContent += `${i + 1}. "${rec.replace(/"/g, '""')}"\n`;
                                });
                              }
                              
                              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `benchmark_${item.id}_${format(new Date(item.created_at), 'yyyy-MM-dd')}.csv`;
                              a.click();
                              URL.revokeObjectURL(url);
                              toast({ title: 'Export Excel réussi', description: 'Ouvrez le fichier CSV avec Excel.' });
                            } catch (error) {
                              toast({ title: 'Erreur', description: 'Impossible de télécharger le rapport', variant: 'destructive' });
                            }
                          }}
                        >
                          <FileSpreadsheet className="w-4 h-4 mr-1" />
                          Excel
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-500 text-red-600 hover:bg-red-50"
                          onClick={async () => {
                            try {
                              const response = await api.get(`/benchmark/${item.id}`);
                              const data = response.data;
                              const allPages = [...(data.myPage ? [data.myPage] : []), ...(data.competitors || [])];
                              
                              const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport Benchmark - ${format(new Date(item.created_at), 'dd/MM/yyyy')}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; background: #1a1d29; color: #e5e7eb; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #8b5cf6; padding-bottom: 20px; }
    h1 { color: #a78bfa; margin: 0; }
    h2 { color: #8b5cf6; border-bottom: 1px solid #374151; padding-bottom: 10px; }
    h3 { color: #60a5fa; }
    .date { color: #9ca3af; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #374151; padding: 12px; text-align: left; }
    th { background: #1f2937; color: #a78bfa; }
    tr:nth-child(even) { background: #111827; }
    .metric { display: inline-block; margin: 10px; padding: 15px; background: #1f2937; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 24px; font-weight: bold; color: #8b5cf6; }
    .metric-label { font-size: 12px; color: #9ca3af; }
    .recommendation { background: #1f2937; padding: 15px; margin: 10px 0; border-left: 4px solid #8b5cf6; border-radius: 4px; }
    .page-section { background: #111827; padding: 20px; margin: 20px 0; border-radius: 8px; }
    @media print { body { background: white; color: black; } th { background: #f3f4f6; color: black; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Rapport Benchmark Concurrentiel</h1>
    <p class="date">Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
    <p class="date">Analyse du ${format(new Date(item.created_at), 'dd MMMM yyyy', { locale: fr })}</p>
  </div>
  
  <h2>📈 Résumé des Pages Analysées</h2>
  <table>
    <tr><th>Page</th><th>Followers</th><th>Posts</th><th>Engagement</th><th>Likes Moy.</th></tr>
    ${allPages.map((p: any) => `<tr><td>${p.pageData?.pageName || 'N/A'}</td><td>${(p.pageData?.followers || 0).toLocaleString()}</td><td>${p.quantitativeMetrics?.totalPosts || 0}</td><td>${p.quantitativeMetrics?.engagementRate || 0}%</td><td>${p.quantitativeMetrics?.avgLikesPerPost || 0}</td></tr>`).join('')}
  </table>
  
  ${allPages.map((p: any) => `
  <div class="page-section">
    <h3>📄 ${p.pageData?.pageName || 'Page'}</h3>
    <div class="metric"><div class="metric-value">${(p.pageData?.followers || 0).toLocaleString()}</div><div class="metric-label">Followers</div></div>
    <div class="metric"><div class="metric-value">${p.quantitativeMetrics?.totalPosts || 0}</div><div class="metric-label">Posts</div></div>
    <div class="metric"><div class="metric-value">${p.quantitativeMetrics?.engagementRate || 0}%</div><div class="metric-label">Engagement</div></div>
    ${p.qualitativeAnalysis?.strengths ? `<h4>Forces</h4><ul>${p.qualitativeAnalysis.strengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>` : ''}
  </div>
  `).join('')}
  
  ${data.comparativeAnalysis?.recommendations ? `
  <h2>💡 Recommandations</h2>
  ${data.comparativeAnalysis.recommendations.map((r: string) => `<div class="recommendation">${r}</div>`).join('')}
  ` : ''}
  
  <div style="text-align: center; margin-top: 40px; color: #6b7280; font-size: 12px;">
    <p>Rapport généré par Easy - Intelligence Sociale</p>
  </div>
</body>
</html>`;
                              
                              const printWindow = window.open('', '_blank');
                              if (printWindow) {
                                printWindow.document.write(htmlContent);
                                printWindow.document.close();
                                printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
                              }
                              toast({ title: 'Export PDF', description: 'Utilisez Ctrl+P pour sauvegarder en PDF.' });
                            } catch (error) {
                              toast({ title: 'Erreur', description: 'Impossible de générer le PDF', variant: 'destructive' });
                            }
                          }}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-navy text-navy hover:bg-navy-50"
                          onClick={async () => {
                            try {
                              const response = await api.get(`/benchmark/${item.id}`);
                              const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `benchmark_${item.id}_${format(new Date(item.created_at), 'yyyy-MM-dd')}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                              toast({ title: 'Téléchargement réussi', description: 'Le rapport a été téléchargé.' });
                            } catch (error) {
                              toast({ title: 'Erreur', description: 'Impossible de télécharger le rapport', variant: 'destructive' });
                            }
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          JSON
                        </Button>
                        <Badge className="bg-cream-100 text-steel border-cream-300">
                          ID: {item.id}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info about backups */}
          <Card className="bg-gold-50 border-gold-200">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-navy mt-0.5" />
                <div>
                  <p className="text-navy font-medium">Données brutes disponibles</p>
                  <p className="text-steel text-sm mt-1">
                    Les données brutes de chaque analyse sont sauvegardées dans le dossier <code className="bg-cream-200 px-1 rounded text-navy">backend/data/backups/</code>. 
                    Vous pouvez y accéder pour une analyse manuelle approfondie.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {report && (
            <>
              {/* Summary Banner */}
              <Card className="bg-gradient-to-r from-steel/20 to-navy/20 border-steel/30">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-steel-400">{getAllPages().length}</div>
                        <div className="text-xs text-steel-200">Pages analysées</div>
                      </div>
                      <div className="h-10 w-px bg-navy-700" />
                      <div className="text-center">
                        <div className="text-3xl font-bold text-navy">
                          {getAllPages().reduce((sum, p) => sum + p.quantitativeMetrics.totalPosts, 0)}
                        </div>
                        <div className="text-xs text-steel-200">Posts analysés</div>
                      </div>
                      <div className="h-10 w-px bg-navy-700" />
                      <div className="text-center">
                        <div className="text-lg font-medium text-green-400">{report.creditsCost} crédits</div>
                        <div className="text-xs text-steel-200">Coût total</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-steel/50 text-steel-300 hover:bg-steel-500/20 hover:text-steel-200"
                        onClick={exportPDF}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-navy/50 text-navy-300 hover:bg-navy-500/20 hover:text-navy-200"
                        onClick={exportRawData}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        JSON
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-green-500/50 text-green-300 hover:bg-green-500/20 hover:text-green-200"
                        onClick={exportPostsCSV}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        CSV
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quantitative Metrics Table */}
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-navy flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-steel-400" />
                    Métriques Quantitatives par Page
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-navy">
                        <TableHead className="text-steel-200">Page</TableHead>
                        <TableHead className="text-steel-200 text-center">Followers</TableHead>
                        <TableHead className="text-steel-200 text-center">Posts</TableHead>
                        <TableHead className="text-steel-200 text-center">Moy. Likes</TableHead>
                        <TableHead className="text-steel-200 text-center">Moy. Comments</TableHead>
                        <TableHead className="text-steel-200 text-center">Engagement</TableHead>
                        <TableHead className="text-steel-200 text-center">Fréquence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getAllPages().map((page, index) => (
                        <TableRow key={index} className="border-navy">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: page.pageData.error ? '#ef4444' : COLORS[index % COLORS.length] }} />
                              <span className="text-navy font-medium">{page.pageData.pageName}</span>
                              {report.myPage && page.pageData.pageUrl === report.myPage.pageData.pageUrl && (
                                <Crown className="w-4 h-4 text-green-400" />
                              )}
                              {page.pageData.error && (
                                <Badge className="bg-red-500/20 text-red-400 ml-2">Protégée</Badge>
                              )}
                            </div>
                          </TableCell>
                          {page.pageData.error ? (
                            <TableCell colSpan={6} className="text-center">
                              <div className="flex items-center justify-center gap-2 text-gold-600 text-sm py-2 bg-gold-50 rounded-lg border border-gold-200 mx-2">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>{page.pageData.error.message}</span>
                              </div>
                            </TableCell>
                          ) : (
                            <>
                              <TableCell className="text-center text-cream-400">{page.pageData.followers.toLocaleString()}</TableCell>
                              <TableCell className="text-center text-cream-400">{page.quantitativeMetrics.totalPosts}</TableCell>
                              <TableCell className="text-center text-navy font-medium">{page.quantitativeMetrics.avgLikesPerPost}</TableCell>
                              <TableCell className="text-center text-steel-400">{page.quantitativeMetrics.avgCommentsPerPost}</TableCell>
                              <TableCell className="text-center">
                                <Badge className={`${
                                  page.quantitativeMetrics.engagementRate >= 5 ? 'bg-green-500/20 text-green-400' :
                                  page.quantitativeMetrics.engagementRate >= 2 ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {page.quantitativeMetrics.engagementRate}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center text-steel-200">{page.quantitativeMetrics.postFrequencyPerMonth}/mois</TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Top Posts by Page */}
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-navy flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    Top Posts par Page
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {getAllPages().map((page, pageIndex) => (
                      <div key={pageIndex} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: page.pageData.error ? '#ef4444' : COLORS[pageIndex % COLORS.length] }} />
                          <h4 className="text-navy font-medium">{page.pageData.pageName}</h4>
                          {page.pageData.error && (
                            <Badge className="bg-red-500/20 text-red-400">Protégée</Badge>
                          )}
                        </div>
                        {page.pageData.error ? (
                          <div className="p-4 bg-gold-50 rounded-lg border border-gold-200">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-gold-700 font-medium text-sm mb-1">Page non accessible</p>
                                <p className="text-gold-600 text-sm">{page.pageData.error.message}</p>
                                <p className="text-steel text-xs mt-2">
                                  💡 Conseil: Vérifiez que la page existe et qu'elle est publique, ou essayez avec une autre page concurrente.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {page.topPosts.slice(0, 3).map((post: any, postIndex: number) => (
                              <div key={postIndex} className="p-3 bg-cream-50 rounded-lg border border-cream-300">
                                <p className="text-navy-700 text-sm line-clamp-2 mb-2">
                                  {post.text || 'Sans texte'}
                                </p>
                                <div className="flex items-center gap-4 text-xs">
                                  <span className="text-navy flex items-center gap-1">
                                    <ThumbsUp className="w-3 h-3" /> {post.likes}
                                  </span>
                                  <span className="text-steel-400 flex items-center gap-1">
                                    <MessageCircle className="w-3 h-3" /> {post.comments}
                                  </span>
                                  <span className="text-green-400 flex items-center gap-1">
                                    <Share2 className="w-3 h-3" /> {post.shares}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-6 mt-4">
          {report && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BenchmarkRadarChart
                  pages={getAllPages().filter(p => !p.pageData.error).map(p => ({
                    pageName: p.pageData.pageName,
                    followers: p.pageData.followers,
                    avgLikesPerPost: p.quantitativeMetrics.avgLikesPerPost,
                    avgCommentsPerPost: p.quantitativeMetrics.avgCommentsPerPost,
                    avgSharesPerPost: p.quantitativeMetrics.avgSharesPerPost,
                    engagementRate: p.quantitativeMetrics.engagementRate,
                    postFrequencyPerMonth: p.quantitativeMetrics.postFrequencyPerMonth,
                  }))}
                  myPageName={report.myPage?.pageData.pageName}
                  className="bg-white border-cream-300 shadow-sm"
                />
                <BenchmarkBarChart
                  pages={getAllPages().filter(p => !p.pageData.error).map(p => ({
                    pageName: p.pageData.pageName,
                    followers: p.pageData.followers,
                    avgLikesPerPost: p.quantitativeMetrics.avgLikesPerPost,
                    avgCommentsPerPost: p.quantitativeMetrics.avgCommentsPerPost,
                    avgSharesPerPost: p.quantitativeMetrics.avgSharesPerPost,
                    engagementRate: p.quantitativeMetrics.engagementRate,
                    postFrequencyPerMonth: p.quantitativeMetrics.postFrequencyPerMonth,
                    totalPosts: p.quantitativeMetrics.totalPosts,
                  }))}
                  myPageName={report.myPage?.pageData.pageName}
                  defaultMetric="engagementRate"
                  className="bg-white border-cream-300 shadow-sm"
                />
              </div>
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-navy flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-gold" />
                    Comparaison des Followers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BenchmarkBarChart
                    pages={getAllPages().filter(p => !p.pageData.error).map(p => ({
                      pageName: p.pageData.pageName,
                      followers: p.pageData.followers,
                      avgLikesPerPost: p.quantitativeMetrics.avgLikesPerPost,
                      avgCommentsPerPost: p.quantitativeMetrics.avgCommentsPerPost,
                      avgSharesPerPost: p.quantitativeMetrics.avgSharesPerPost,
                      engagementRate: p.quantitativeMetrics.engagementRate,
                      postFrequencyPerMonth: p.quantitativeMetrics.postFrequencyPerMonth,
                      totalPosts: p.quantitativeMetrics.totalPosts,
                    }))}
                    myPageName={report.myPage?.pageData.pageName}
                    defaultMetric="followers"
                    className="border-0 shadow-none"
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Qualitative Analysis Tab */}
        <TabsContent value="qualitative" className="space-y-4 mt-4">
          {report && (
            <div className="space-y-6">
              {getAllPages().map((page, pageIndex) => (
                <Card key={pageIndex} className="bg-white border-cream-300 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-navy flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: page.pageData.error ? '#ef4444' : COLORS[pageIndex % COLORS.length] }} />
                      {page.pageData.pageName}
                      {report.myPage && page.pageData.pageUrl === report.myPage.pageData.pageUrl && (
                        <Badge className="bg-green-500/20 text-green-400 ml-2">Votre page</Badge>
                      )}
                      {page.pageData.error && (
                        <Badge className="bg-red-500/20 text-red-400 ml-2">Protégée</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {page.pageData.error ? (
                      <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                        <p className="text-red-400">{page.pageData.error.message}</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Fréquence */}
                          <div className="p-4 bg-navy-50 rounded-lg border border-navy-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-navy" />
                              <span className="text-navy-700 text-sm font-medium">Fréquence de publication</span>
                            </div>
                            <p className="text-navy">{page.qualitativeAnalysis.publicationFrequency}</p>
                          </div>

                          {/* Types de contenu */}
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-green-600" />
                              <span className="text-green-700 text-sm font-medium">Types de contenu</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {page.qualitativeAnalysis.contentTypes.map((type, i) => (
                                <Badge key={i} className="bg-green-100 text-green-700 border border-green-300 text-xs">{type}</Badge>
                              ))}
                            </div>
                          </div>

                          {/* Style visuel */}
                          <div className="p-4 bg-steel-50 rounded-lg border border-steel-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Palette className="w-4 h-4 text-steel-600" />
                              <span className="text-steel-700 text-sm font-medium">Style visuel</span>
                            </div>
                            <p className="text-navy-700 text-sm">{page.qualitativeAnalysis.visualStyle.description}</p>
                          </div>

                          {/* Tonalité */}
                          <div className="p-4 bg-gold-50 rounded-lg border border-gold-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Volume2 className="w-4 h-4 text-gold-600" />
                              <span className="text-gold-700 text-sm font-medium">Tonalité</span>
                            </div>
                            <p className="text-navy-700 text-sm">{page.qualitativeAnalysis.tonality.description}</p>
                          </div>

                          {/* Thématiques */}
                          <div className="p-4 bg-steel-50 rounded-lg border border-steel-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="w-4 h-4 text-steel-600" />
                              <span className="text-steel-700 text-sm font-medium">Thématiques principales</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {page.qualitativeAnalysis.mainThemes.map((theme, i) => (
                                <Badge key={i} className="bg-steel-100 text-steel-700 border border-steel-300 text-xs">{theme}</Badge>
                              ))}
                            </div>
                          </div>

                          {/* Réaction du public */}
                          <div className="p-4 bg-gold-50 rounded-lg border border-gold-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-gold-600" />
                              <span className="text-gold-700 text-sm font-medium">Réaction du public</span>
                            </div>
                            <p className="text-navy-700 text-sm">{page.qualitativeAnalysis.audienceReaction}</p>
                          </div>
                        </div>

                        {/* Forces et Faiblesses */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="text-green-700 font-semibold">Forces</span>
                            </div>
                            <ul className="space-y-2">
                              {page.qualitativeAnalysis.strengths.map((strength, i) => (
                                <li key={i} className="text-navy-700 text-sm flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                                  {strength}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertCircle className="w-5 h-5 text-red-600" />
                              <span className="text-red-700 font-semibold">Faiblesses</span>
                            </div>
                            <ul className="space-y-2">
                              {page.qualitativeAnalysis.weaknesses.map((weakness, i) => (
                                <li key={i} className="text-navy-700 text-sm flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                                  {weakness}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4 mt-4">
          {report && report.comparativeAnalysis && (
            <>
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-navy">Classements par Métrique</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {report.comparativeAnalysis.rankings.map((ranking, rankIndex) => (
                      <div key={rankIndex} className="space-y-3">
                        <h4 className="text-cream-400 font-medium">{ranking.metric}</h4>
                        <div className="space-y-2">
                          {ranking.rankings.map((item, itemIndex) => {
                            const page = getAllPages().find(p => p.pageData.pageName === item.pageName);
                            const isMyPage = report.myPage && page?.pageData.pageUrl === report.myPage.pageData.pageUrl;
                            return (
                              <div 
                                key={itemIndex} 
                                className={`flex items-center gap-4 p-3 rounded-lg ${
                                  isMyPage ? 'bg-green-50 border border-green-200' : 'bg-cream-50'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                  item.rank === 1 ? 'bg-yellow-500 text-black' :
                                  item.rank === 2 ? 'bg-cream-400 text-black' :
                                  item.rank === 3 ? 'bg-gold-600 text-white' :
                                  'bg-navy-700 text-cream-400'
                                }`}>
                                  {item.rank}
                                </div>
                                <div className="flex-1">
                                  <span className={`font-medium ${isMyPage ? 'text-green-600' : 'text-navy'}`}>
                                    {item.pageName}
                                  </span>
                                  {isMyPage && <Crown className="w-4 h-4 text-green-400 inline ml-2" />}
                                </div>
                                <div className="text-steel-400 font-bold">
                                  {typeof item.value === 'number' && item.value % 1 !== 0 
                                    ? item.value.toFixed(2) 
                                    : item.value}
                                  {ranking.metric.includes('Engagement') && '%'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4 mt-4">
          {report && report.comparativeAnalysis && (
            <Card className="bg-white border-cream-300 shadow-sm">
              <CardHeader>
                <CardTitle className="text-navy flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Recommandations Stratégiques
                </CardTitle>
                <CardDescription className="text-steel-200">
                  {report.comparativeAnalysis.summary}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.comparativeAnalysis.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-cream-50 rounded-lg border border-cream-300">
                      <div className="w-8 h-8 rounded-full bg-steel-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-steel-400 font-bold">{index + 1}</span>
                      </div>
                      <p className="text-navy-700">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <FavoritesManager
        open={showFavoritesManager}
        onOpenChange={setShowFavoritesManager}
        defaultTab="benchmark"
      />
    </div>
  );
};

export default BenchmarkPage;
