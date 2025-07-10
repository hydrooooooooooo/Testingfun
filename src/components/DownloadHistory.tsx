import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { Download } from 'lucide-react';

interface Download {
  id: number;
  file_name: string;
  download_date: string;
  file_url: string; // En supposant que l'API retourne une URL de téléchargement
}

export default function DownloadHistory() {
  const { token } = useAuth();
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDownloads = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/user/downloads`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
                    throw new Error("Erreur lors de la récupération de l'historique des téléchargements.");
        }

        const data = await response.json();
        setDownloads(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur inconnue est survenue.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDownloads();
  }, [token]);

  if (isLoading) {
    return <div>Chargement de l'historique des téléchargements...</div>;
  }

  if (error) {
    return <div className="text-red-500">Erreur: {error}</div>;
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Historique des Téléchargements</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Nom du Fichier</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {downloads.length > 0 ? (
              downloads.map((download) => (
                <TableRow key={download.id}>
                  <TableCell>{new Date(download.download_date).toLocaleDateString()}</TableCell>
                  <TableCell>{download.file_name}</TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="sm">
                      <a href={download.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">Aucun téléchargement trouvé.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
