import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';

interface SubSession {
  pageName: string;
  url: string;
  infoStatus?: string;
  postsStatus?: string;
  commentsStatus?: string;
}

interface FacebookPagesProgressProps {
  progress: number;
  overallStatus: string;
  subSessions: SubSession[];
}

export default function FacebookPagesProgress({ progress, overallStatus, subSessions }: FacebookPagesProgressProps) {
  const hasComments = subSessions.some(s => s.commentsStatus);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'FAILED':
      case 'ABORTED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'RUNNING':
        return <Loader2 className="w-5 h-5 text-navy animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-steel-200" />;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return 'Terminé';
      case 'FAILED':
        return 'Échoué';
      case 'ABORTED':
        return 'Annulé';
      case 'RUNNING':
        return 'En cours...';
      default:
        return 'En attente';
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8 border border-cream-200">
      <h2 className="text-2xl font-bold text-navy mb-6">Extraction en cours</h2>

      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-navy-700">Progression globale</span>
          <span className="text-sm font-medium text-navy">{progress}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      <div className="space-y-4">
        {subSessions.map((subSession, index) => (
          <div key={index} className="border border-cream-300 rounded-xl p-4">
            <h3 className="font-semibold text-navy mb-3">{subSession.pageName}</h3>
            <div className="text-sm text-steel mb-3 truncate">{subSession.url}</div>

            <div className={`grid gap-4 ${hasComments ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div className="flex items-center gap-2">
                {getStatusIcon(subSession.infoStatus)}
                <div>
                  <div className="text-xs text-steel">Informations</div>
                  <div className="text-sm font-medium">{getStatusText(subSession.infoStatus)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getStatusIcon(subSession.postsStatus)}
                <div>
                  <div className="text-xs text-steel">Posts</div>
                  <div className="text-sm font-medium">{getStatusText(subSession.postsStatus)}</div>
                </div>
              </div>

              {hasComments && (
                <div className="flex items-center gap-2">
                  {getStatusIcon(subSession.commentsStatus)}
                  <div>
                    <div className="text-xs text-steel">Commentaires</div>
                    <div className="text-sm font-medium">{getStatusText(subSession.commentsStatus)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {overallStatus === 'SUCCEEDED' && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">Extraction terminée avec succès !</span>
          </div>
        </div>
      )}
    </div>
  );
}
