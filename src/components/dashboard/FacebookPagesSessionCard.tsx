import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileSpreadsheet, Archive, CheckCircle, ChevronDown, ChevronUp, ExternalLink, Facebook, Download, Loader2, Clock, Eye, Info, MessageSquare, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '@/services/api';
import { toast } from '@/hooks/use-toast';

interface SubSession {
  pageName: string;
  url: string;
  infoStatus?: string;
  infoDatasetId?: string;
  postsStatus?: string;
  postsDatasetId?: string;
}

interface ExtractionConfig {
  extractInfo?: boolean;
  extractPosts?: boolean;
  postsLimit?: number;
  extractComments?: boolean;
  commentsLimit?: number;
  singlePostUrl?: string;
}

interface FacebookPagesSessionProps {
  session: {
    id: string;
    created_at: string;
    page_urls?: string[];
    sub_sessions?: SubSession[];
    extraction_config?: ExtractionConfig;
    extract_comments?: boolean;
    comments_limit?: number;
    total_comments_scraped?: number;
    isPaid: boolean;
  };
  onViewItems?: (sessionId: string) => void;
}

export default function FacebookPagesSessionCard({ session, onViewItems }: FacebookPagesSessionProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentDownload, setCurrentDownload] = useState<string | null>(null);
  // Expand all pages by default
  const [expandedPages, setExpandedPages] = useState<Set<number>>(
    new Set(Array.from({ length: session.sub_sessions?.length || 0 }, (_, i) => i))
  );

  const togglePage = (index: number) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPages(newExpanded);
  };

  const handleDownload = async (fileType: 'zip' | 'info' | 'posts' | 'comments', pageName?: string) => {
    const extension = fileType === 'zip' ? 'zip' : 'xlsx';
    const filename = fileType === 'zip' 
      ? `facebook_pages_${session.id}.zip`
      : `${pageName}_${fileType}_${session.id}.xlsx`;
    
    setDownloading(true);
    setDownloadProgress(0);
    setCurrentDownload(filename);
    
    try {
      const params: any = {
        sessionId: session.id,
        fileType,
      };
      
      if (pageName) {
        params.pageName = pageName;
      }

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      const response = await api.get('/export/facebook-pages', {
        params,
        responseType: 'blob',
      });

      clearInterval(progressInterval);
      setDownloadProgress(100);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({ 
        title: "✅ Téléchargement réussi", 
        description: `${filename} a été téléchargé avec succès.` 
      });
    } catch (error: any) {
      console.error('Error downloading:', error);
      toast({ 
        title: "❌ Erreur", 
        description: error.response?.data?.message || "Erreur lors du téléchargement", 
        variant: "destructive" 
      });
    } finally {
      setTimeout(() => {
        setDownloading(false);
        setDownloadProgress(0);
        setCurrentDownload(null);
      }, 500);
    }
  };

  const subSessions = session.sub_sessions || [];

  return (
    <div className="group bg-white rounded-xl border border-cream-300 hover:border-gold-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-gold-50 to-navy-50 px-3 sm:px-4 py-2 sm:py-3 border-b border-cream-300">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-steel-500 to-navy-500 flex items-center justify-center shadow-sm">
                <Facebook className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-cream-300">
                <span className="text-xs font-bold text-steel-600">{subSessions.length}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-navy">Extraction Facebook</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-steel mt-0.5">
                <Clock className="w-3 h-3" />
                <span>{format(new Date(session.created_at), 'd MMM yyyy, HH:mm', { locale: fr })}</span>
                <span className="text-steel">•</span>
                <code className="font-mono text-steel">{session.id}</code>
              </div>
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {onViewItems && (
              <Button
                onClick={() => onViewItems(session.id)}
                size="sm"
                className="bg-gradient-to-r from-steel-600 to-navy hover:from-steel-700 hover:to-navy-400 text-white font-medium shadow-sm text-xs sm:text-sm px-2 sm:px-3"
              >
                <Eye className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Voir les détails</span>
              </Button>
            )}
            {subSessions.length > 1 && (
              <Button
                onClick={() => handleDownload('zip')}
                disabled={downloading || !session.isPaid}
                size="sm"
                variant="ghost"
                className="hover:bg-steel-500/20"
              >
                {downloading && currentDownload?.includes('.zip') ? (
                  <Loader2 className="w-4 h-4 animate-spin text-steel-600" />
                ) : (
                  <Archive className="w-4 h-4 text-steel" />
                )}
              </Button>
            )}
          </div>
        </div>
        
        {/* Download Progress */}
        {downloading && (
          <div className="mt-3 space-y-1">
            <Progress value={downloadProgress} className="h-1" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-steel truncate flex-1">{currentDownload}</span>
              <span className="text-xs font-semibold text-steel-600 ml-2">{downloadProgress}%</span>
            </div>
          </div>
        )}

        {/* Extraction Options Display */}
        {(() => {
          const config = session.extraction_config || {};
          const extractComments = config.extractComments || session.extract_comments;
          const hasOptions = config.extractInfo || config.extractPosts || extractComments || config.postsLimit || config.singlePostUrl;
          
          if (!hasOptions) return null;
          
          return (
            <div className="mt-3 pt-3 border-t border-cream-300">
              <div className="flex items-center gap-1.5 mb-2">
                <Settings2 className="w-3.5 h-3.5 text-steel-200" />
                <span className="text-xs font-medium text-steel-200">Options configurées</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {config.extractInfo && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-600 border border-green-300">
                    <Info className="w-3 h-3" />
                    Infos page
                  </span>
                )}
                {config.extractPosts && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-navy-100 text-navy border border-navy-300">
                    <FileSpreadsheet className="w-3 h-3" />
                    Posts {config.postsLimit ? `(max ${config.postsLimit})` : ''}
                  </span>
                )}
                {extractComments && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-steel-100 text-steel-600 border border-steel-300">
                    <MessageSquare className="w-3 h-3" />
                    Commentaires {config.commentsLimit || session.comments_limit ? `(max ${config.commentsLimit || session.comments_limit})` : ''}
                  </span>
                )}
                {session.total_comments_scraped && session.total_comments_scraped > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-steel-50 text-steel-600">
                    {session.total_comments_scraped} commentaires extraits
                  </span>
                )}
                {config.singlePostUrl && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gold-100 text-gold-600 border border-gold-300">
                    Post unique
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Pages Grid */}
      <div className="p-4">
        <div className="grid gap-3">
          {subSessions.map((subSession, index) => {
            const isExpanded = expandedPages.has(index);
            const hasInfo = subSession.infoDatasetId && subSession.infoStatus === 'SUCCEEDED';
            const hasPosts = subSession.postsDatasetId && subSession.postsStatus === 'SUCCEEDED';
            const isProcessing = (!hasInfo && !hasPosts) || 
              (subSession.infoStatus === 'RUNNING') || 
              (subSession.postsStatus === 'RUNNING');
            
            return (
              <div 
                key={index} 
                className="group relative bg-cream-50 rounded-lg border border-cream-300 hover:border-gold-300 hover:shadow-md transition-all duration-200"
              >
                {/* Compact Page Card */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    {/* Page Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-sm font-semibold text-navy truncate">{subSession.pageName}</h4>
                        <a 
                          href={subSession.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-navy hover:text-navy-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      
                      {/* Status Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isProcessing && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gold-100 text-gold-600">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            En cours
                          </span>
                        )}
                        {hasInfo && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            Infos
                          </span>
                        )}
                        {hasPosts && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-navy-100 text-navy">
                            <CheckCircle className="w-3 h-3" />
                            Posts
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {hasInfo && (
                        <Button
                          onClick={() => handleDownload('info', subSession.pageName)}
                          disabled={downloading || !session.isPaid}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-emerald-500/20"
                          title="Télécharger les informations"
                        >
                          {downloading && currentDownload?.includes(`${subSession.pageName}_info`) ? (
                            <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                          )}
                        </Button>
                      )}
                      {hasPosts && (
                        <Button
                          onClick={() => handleDownload('posts', subSession.pageName)}
                          disabled={downloading || !session.isPaid}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-navy/20"
                          title="Télécharger les posts"
                        >
                          {downloading && currentDownload?.includes(`${subSession.pageName}_posts`) ? (
                            <Loader2 className="w-4 h-4 animate-spin text-navy" />
                          ) : (
                            <Download className="w-4 h-4 text-navy" />
                          )}
                        </Button>
                      )}
                      {(session.extraction_config?.extractComments || session.extract_comments) && (
                        <Button
                          onClick={() => handleDownload('comments', subSession.pageName)}
                          disabled={downloading || !session.isPaid}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-steel/20"
                          title="Télécharger les commentaires"
                        >
                          {downloading && currentDownload?.includes(`${subSession.pageName}_comments`) ? (
                            <Loader2 className="w-4 h-4 animate-spin text-steel" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-steel" />
                          )}
                        </Button>
                      )}
                      <Button
                        onClick={() => togglePage(index)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-steel-200" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-steel-200" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-cream-300 space-y-2">
                      <div className="text-xs text-steel break-all">{subSession.url}</div>
                      
                      {!hasInfo && !hasPosts && isProcessing && (
                        <div className="flex items-center gap-2 p-2 bg-gold-500/10 rounded-md">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-600" />
                          <span className="text-xs text-gold-600 font-medium">Extraction en cours...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Banner */}
      {!session.isPaid && (
        <div className="mx-4 mb-4 p-3 bg-gradient-to-r from-gold-500/10 via-gold-500/10 to-gold-500/10 border border-gold-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center shadow-sm">
              <span className="text-lg">🔒</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gold-400">Paiement requis</p>
              <p className="text-xs text-gold-300">Déverrouillez vos données</p>
            </div>
            <Button 
              className="bg-gradient-to-r from-gold-500 to-gold-500 hover:from-gold-600 hover:to-gold-600 text-white font-medium shadow-sm"
              size="sm"
            >
              Payer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}