import React from 'react';
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
import { DownloadCloud } from 'lucide-react';

// Interface for a single download
interface Download {
  id: number;
  file_path: string;
  scraped_url: string;
  downloaded_at: string;
  results_count: number;
  file_size: number;
}

// Interface for the component's props
interface FilesTabProps {
  downloads: Download[];
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const FilesTab: React.FC<FilesTabProps> = ({ downloads }) => {
  if (!downloads) {
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
                <TableHead>Source</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Résultats</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {downloads.length > 0 ? (
                downloads.map((download) => (
                  <TableRow key={download.id}>
                    <TableCell className="font-medium">
                      <a href={download.scraped_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {new URL(download.scraped_url).hostname.replace('www.', '')}
                      </a>
                    </TableCell>
                    <TableCell>
                      {format(new Date(download.downloaded_at), 'd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>{download.results_count}</TableCell>
                    <TableCell>{formatBytes(download.file_size)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <a href={`${import.meta.env.VITE_API_BASE_URL}/downloads/${download.file_path}`}>
                          <DownloadCloud className="mr-2 h-4 w-4" />
                          Télécharger
                        </a>
                      </Button>
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
