import React, { useState } from 'react';
import axios from 'axios';
import { toast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DownloadCloud, Loader2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Session } from '@/types'; // Importer le type Session

// Mettre à jour les props pour accepter un tableau de sessions
interface FilesTabProps {
  sessions: Session[];
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const FilesTab: React.FC<FilesTabProps> = ({ sessions }) => {
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);

  const handleDownload = async (session: Session, format: 'excel' | 'csv') => {
    if (!session.id || !session.downloadToken) {
      toast({ title: "Erreur", description: "Informations de session invalides.", variant: "destructive" });
      return;
    }

    setLoadingSessionId(session.id);
    toast({ title: "Préparation du fichier", description: `Le téléchargement de votre fichier ${format.toUpperCase()} va bientôt commencer...` });

    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/sessions/${session.id}/download`, {
        params: { format, token: session.downloadToken },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = format === 'excel' ? 'xlsx' : 'csv';
      const filename = `session-${session.id}.${extension}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({ title: "Téléchargement réussi", description: `Le fichier ${filename} a bien été téléchargé.` });
    } catch (error) {
      console.error(`Erreur lors du téléchargement du fichier ${format}:`, error);
      toast({ title: "Erreur de téléchargement", description: "Impossible de télécharger le fichier. Veuillez réessayer.", variant: "destructive" });
    } finally {
      setLoadingSessionId(null);
    }
  };
  if (!sessions) {
    return <div>Chargement des fichiers...</div>;
  }

  return (
    <div className="space-y-6 pt-6">
      <Card>
        <CardHeader>
          <CardTitle>Historique des fichiers</CardTitle>
          <CardDescription>
            Consultez et téléchargez les fichiers que vous avez générés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>URL Scannée</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-mono text-xs">{session.id}</TableCell>
                    <TableCell>
                      <a href={session.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-xs">
                        {session.url}
                      </a>
                    </TableCell>
                    <TableCell>
                      {format(new Date(session.created_at), 'd MMM yyyy, HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right">
                      {loadingSessionId === session.id ? (
                        <Button variant="outline" size="sm" disabled>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          En cours...
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleDownload(session, 'excel')}>
                              <DownloadCloud className="mr-2 h-4 w-4" />
                              <span>Télécharger (Excel)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(session, 'csv')}>
                              <DownloadCloud className="mr-2 h-4 w-4" />
                              <span>Télécharger (CSV)</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Aucun fichier trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};



export default FilesTab;
