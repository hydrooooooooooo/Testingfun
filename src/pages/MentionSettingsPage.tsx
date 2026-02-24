import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, X, Save, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { toast } from '@/hooks/use-toast';

const MentionSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      setLoading(true);
      const response = await api.get('/mentions/keywords');
      setKeywords(response.data.keywords || []);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors du chargement des mots-clés',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/mentions/keywords', {
        keywords: keywords.map(k => ({ keyword: k, category: 'custom' })),
      });
      toast({
        title: 'Succès',
        description: `${keywords.length} mot(s)-clé(s) sauvegardé(s)`,
      });
      navigate('/dashboard/mentions');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Erreur lors de la sauvegarde',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const suggestedKeywords = [
    'Votre Marque',
    'Nom de Produit',
    'Concurrent',
    '@VotreMarque',
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl pt-14 md:pt-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/dashboard/mentions">
          <Button variant="ghost" className="mb-4 flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour aux mentions
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Configuration des Mots-Clés</h1>
        <p className="text-steel">
          Définissez les mots-clés à surveiller dans les commentaires Facebook
        </p>
      </div>

      {/* Instructions */}
      <Card className="mb-6 bg-navy-50 border-navy-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-navy mb-2">💡 Comment ça marche ?</h3>
          <ul className="text-sm text-navy space-y-1">
            <li>• Ajoutez les noms de votre marque, produits, ou concurrents</li>
            <li>• Les commentaires contenant ces mots-clés seront automatiquement détectés</li>
            <li>• L'IA classifiera chaque mention (recommandation, question, plainte)</li>
            <li>• Vous recevrez des alertes pour les mentions urgentes</li>
          </ul>
        </CardContent>
      </Card>

      {/* Add Keyword */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ajouter un Mot-Clé</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Honda, Bet261, @VotreMarque..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
            />
            <Button onClick={handleAddKeyword} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </div>

          {/* Suggested Keywords */}
          <div className="mt-4">
            <p className="text-sm text-steel mb-2">Suggestions :</p>
            <div className="flex gap-2 flex-wrap">
              {suggestedKeywords.map((keyword) => (
                <Badge
                  key={keyword}
                  variant="outline"
                  className="cursor-pointer hover:bg-cream-100"
                  onClick={() => setNewKeyword(keyword)}
                >
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keywords List */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Mots-Clés Configurés ({keywords.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-navy" />
            </div>
          ) : keywords.length === 0 ? (
            <div className="text-center py-8 text-steel">
              <p>Aucun mot-clé configuré</p>
              <p className="text-sm">Ajoutez votre premier mot-clé ci-dessus</p>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {keywords.map((keyword) => (
                <Badge
                  key={keyword}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-1.5"
                >
                  {keyword}
                  <button
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="hover:text-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Link to="/dashboard/mentions">
          <Button variant="outline">Annuler</Button>
        </Link>
        <Button
          onClick={handleSave}
          disabled={saving || keywords.length === 0}
          className="flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Sauvegarder
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default MentionSettingsPage;
