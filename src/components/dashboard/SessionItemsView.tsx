import React, { useState } from 'react';
import { useScrapedItems } from '@/hooks/useScrapedItems';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Heart,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  BarChart3,
  Grid3x3,
  List,
  Star,
  Calendar,
  MessageCircle,
  TrendingUp,
  ThumbsUp,
  Download,
  FileSpreadsheet,
  Loader2,
  Facebook,
  Phone,
  Mail,
  Globe,
  Users,
  Clock,
} from 'lucide-react';
import { ItemsFilter, ItemsSort } from '@/types/scrapedItems';
import ItemCard from './ItemCard';
import ItemsList from './ItemsList';
import SessionStatsPanel from './SessionStatsPanel';
import { CommentsViewer } from '@/components/CommentsViewer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SessionItemsViewProps {
  sessionId: string;
  sessionUrl?: string;
}

const SessionItemsView: React.FC<SessionItemsViewProps> = ({ sessionId, sessionUrl }) => {
  const {
    items,
    stats,
    loading,
    error,
    pagination,
    fetchItems,
    toggleFavorite,
    updateNotes,
  } = useScrapedItems(sessionId);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showStats, setShowStats] = useState(true);
  const [filters, setFilters] = useState<ItemsFilter>({});
  const [sort, setSort] = useState<ItemsSort>({ field: 'position', order: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    setFilters({ ...filters, search: searchTerm });
    fetchItems(1, { ...filters, search: searchTerm }, sort);
  };

  const handleFilterChange = (key: keyof ItemsFilter, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchItems(1, newFilters, sort);
  };

  const handleSortChange = (field: string) => {
    const newSort: ItemsSort = {
      field: field as any,
      order: sort.field === field && sort.order === 'asc' ? 'desc' : 'asc',
    };
    setSort(newSort);
    fetchItems(pagination.page, filters, newSort);
  };

  const handlePageChange = (newPage: number) => {
    fetchItems(newPage, filters, sort);
  };

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      {stats && showStats && (
        <SessionStatsPanel stats={stats} sessionUrl={sessionUrl} />
      )}

      {/* Barre de recherche et filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-steel-200 w-4 h-4" />
                <Input
                  placeholder="Rechercher dans les résultats..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} variant="default">
                Rechercher
              </Button>
            </div>

            {/* Filtres rapides */}
            <div className="flex gap-2">
              <Select
                value={sort.field}
                onValueChange={(value) => handleSortChange(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Trier par..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="position">Position</SelectItem>
                  <SelectItem value="price">Prix</SelectItem>
                  <SelectItem value="title">Titre</SelectItem>
                  <SelectItem value="created_at">Date</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowStats(!showStats)}
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filtres avancés */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant={filters.isFavorite ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('isFavorite', !filters.isFavorite)}
            >
              <Heart className="w-4 h-4 mr-2" />
              Favoris uniquement
            </Button>
            
            {filters.search && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => {
                setSearchTerm('');
                handleFilterChange('search', undefined);
              }}>
                Recherche: {filters.search} ×
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Liste des items */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-navy border-t-transparent rounded-full"></div>
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-steel">Aucun résultat trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onToggleFavorite={toggleFavorite}
                  onUpdateNotes={updateNotes}
                />
              ))}
            </div>
          ) : (
            <ItemsList
              items={items}
              onToggleFavorite={toggleFavorite}
              onUpdateNotes={updateNotes}
            />
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-steel">
                    Page {pagination.page} sur {pagination.totalPages} ({pagination.total} résultats)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Suivant
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default SessionItemsView;

// Facebook Page Items View Component
// Additional imports needed for Facebook Page view
import { useEffect } from 'react';
import api from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface FacebookPageData {
  facebookUrl: string;
  categories: string[];
  info: string[];
  likes: number;
  title: string;
  address?: string;
  pageId: string;
  pageName: string;
  pageUrl: string;
  intro?: string;
  websites?: string[];
  phone?: string;
  email?: string;
  website?: string;
  followers: number;
  followings: number;
  profilePictureUrl?: string;
  coverPhotoUrl?: string;
  category?: string;
  business_hours?: string;
  creation_date?: string;
  ad_status?: string;
}

interface FacebookPageItemsViewProps {
  sessionId: string;
  pageName?: string;
  pageData?: FacebookPageData; // Accept page data directly
  hasPostsAvailable?: boolean; // Whether posts are available for this page
}

// Facebook Posts View Component
interface FacebookPost {
  postId: string;
  url: string;
  text: string;
  time: string;
  user: {
    name: string;
    profileUrl: string;
    profilePic?: string;
  };
  likes?: number;
  comments?: number;
  shares?: number;
  images?: string[];
  video?: string;
}

interface FacebookPostsViewProps {
  sessionId: string;
  pageName?: string;
}

export function FacebookPostsView({ sessionId, pageName }: FacebookPostsViewProps) {
  const [postsData, setPostsData] = useState<FacebookPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPostsData = async () => {
      try {
        setIsLoading(true);
        const params = pageName ? { pageName } : {};
        const response = await api.get(`/sessions/facebook-pages/${sessionId}/posts`, { params });
        setPostsData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erreur lors du chargement des posts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostsData();
  }, [sessionId, pageName]);

  const toggleComments = (postId: string) => {
    setExpandedPostId(expandedPostId === postId ? null : postId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-700">
            <MapPin className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!postsData || postsData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Aucun post disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {postsData.map((post) => (
        <Card key={post.postId} className="group hover:shadow-md transition-all duration-200 border-cream-300">
          <CardContent className="p-4">
              {/* Post Header */}
              <div className="flex items-start gap-3 mb-3">
                {post.user?.profilePic && (
                  <img 
                    src={post.user?.profilePic} 
                    alt={post.user?.name || 'User'}
                    className="w-9 h-9 rounded-full flex-shrink-0 ring-2 ring-cream-100"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <a 
                    href={post.user?.profileUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-navy hover:text-navy transition-colors"
                  >
                    {post.user?.name || 'Utilisateur inconnu'}
                  </a>
                  <p className="text-xs text-steel mt-0.5">
                    {post.time ? format(new Date(post.time), "d MMM yyyy à HH:mm", { locale: fr }) : 'Date inconnue'}
                  </p>
                </div>
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-steel-200 hover:text-navy transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Post Content */}
              <p className="text-sm text-navy-700 mb-3 line-clamp-3 leading-relaxed">{post.text}</p>
              
              {/* Images */}
              {post.images && post.images.length > 0 && (
                <div className={`grid gap-2 mb-3 ${
                  post.images.length === 1 ? 'grid-cols-1' : 
                  post.images.length === 2 ? 'grid-cols-2' : 
                  'grid-cols-2'
                }`}>
                  {post.images.slice(0, 4).map((img, idx) => (
                    <div key={idx} className="relative overflow-hidden rounded-lg bg-cream-100">
                      <img 
                        src={img} 
                        alt={`Image ${idx + 1}`}
                        className="w-full h-40 object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Engagement Stats */}
              <div className="flex items-center justify-between pt-3 border-t border-cream-200">
                <div className="flex items-center gap-4">
                  {post.likes !== undefined && (
                    <div className="flex items-center gap-1.5 text-steel">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-medium">{post.likes.toLocaleString()}</span>
                    </div>
                  )}
                  {post.comments !== undefined && (
                    <div className="flex items-center gap-1.5 text-steel">
                      <MessageCircle className="w-4 h-4 text-navy" />
                      <span className="text-xs font-medium">{post.comments.toLocaleString()}</span>
                    </div>
                  )}
                  {post.shares !== undefined && (
                    <div className="flex items-center gap-1.5 text-steel">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-medium">{post.shares.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Bouton Voir les commentaires */}
                {post.comments !== undefined && post.comments > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleComments(post.postId)}
                    className="h-7 text-xs gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {expandedPostId === post.postId ? 'Masquer' : 'Voir'} les commentaires
                    <ChevronDown className={`w-3 h-3 transition-transform ${expandedPostId === post.postId ? 'rotate-180' : ''}`} />
                  </Button>
                )}
              </div>

              {/* Section Commentaires */}
              {expandedPostId === post.postId && (
                <div className="mt-4 pt-4 border-t border-cream-300">
                  <CommentsViewer
                    sessionId={sessionId}
                    postUrl={post.url}
                    postText={post.text}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

export function FacebookPageItemsView({ sessionId, pageName, pageData: initialPageData, hasPostsAvailable = true }: FacebookPageItemsViewProps) {
  const [pageData, setPageData] = useState<FacebookPageData | null>(initialPageData || null);
  const [isLoading, setIsLoading] = useState(!initialPageData);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentDownload, setCurrentDownload] = useState<string | null>(null);
  const [showPosts, setShowPosts] = useState(true);

  useEffect(() => {
    // Only fetch if no data was provided
    if (initialPageData) {
      setPageData(initialPageData);
      setIsLoading(false);
      return;
    }

    const fetchPageData = async () => {
      try {
        setIsLoading(true);
        const params = pageName ? { pageName } : {};
        const response = await api.get(`/sessions/facebook-pages/${sessionId}/info`, { params });
        setPageData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erreur lors du chargement des données');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPageData();
  }, [sessionId, pageName, initialPageData]);

  const handleDownload = async (fileType: 'info' | 'posts') => {
    const fileName = `${pageData?.pageName || 'facebook-page'}_${fileType}_${sessionId}.xlsx`;
    
    setDownloading(true);
    setDownloadProgress(0);
    setCurrentDownload(fileName);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      const response = await api.get('/export/facebook-pages', {
        params: {
          sessionId,
          fileType,
          pageName: pageData?.pageName
        },
        responseType: 'blob',
      });

      clearInterval(progressInterval);
      setDownloadProgress(100);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({ 
        title: '✅ Téléchargement réussi', 
        description: `${fileName} a été téléchargé avec succès.` 
      });
    } catch (error: any) {
      console.error('Error downloading:', error);
      toast({ 
        title: '❌ Erreur', 
        description: error.response?.data?.message || 'Erreur lors du téléchargement', 
        variant: 'destructive' 
      });
    } finally {
      setTimeout(() => {
        setDownloading(false);
        setDownloadProgress(0);
        setCurrentDownload(null);
      }, 500);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="pt-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!pageData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Aucune donnée disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Download Progress */}
      {downloading && (
        <div className="p-3 bg-gradient-to-r from-navy-50 to-navy-50 border border-navy-200 rounded-lg">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-navy-700 truncate flex-1">{currentDownload}</span>
              <span className="text-xs font-bold text-navy ml-2">{downloadProgress}%</span>
            </div>
            <Progress value={downloadProgress} className="h-1.5" />
          </div>
        </div>
      )}

      {/* Modern Header */}
      <div className="relative overflow-hidden rounded-xl border border-cream-300">
        {/* Cover Photo */}
        {pageData.coverPhotoUrl && (
          <div className="relative h-32 bg-gradient-to-br from-steel-100 to-gold-100">
            <img 
              src={pageData.coverPhotoUrl} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}
        
        {/* Profile Section */}
        <div className="relative px-4 pb-4 bg-white">
          <div className="flex items-end gap-3 -mt-8">
            {pageData.profilePictureUrl && (
              <img 
                src={pageData.profilePictureUrl} 
                alt={pageData.pageName}
                className="w-20 h-20 rounded-xl border-4 border-white shadow-lg flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0 pb-2">
              <h1 className="text-lg font-bold text-navy truncate">{pageData.title}</h1>
              <p className="text-sm text-steel">@{pageData.pageName}</p>
            </div>
            <a 
              href={pageData.pageUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mb-2 px-3 py-1.5 bg-navy hover:bg-navy-400 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Facebook className="w-3.5 h-3.5" />
              Voir sur FB
            </a>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-gradient-to-br from-navy-50 to-navy-100 rounded-lg border border-navy-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-navy" />
            <span className="text-xs font-medium text-navy">Abonnés</span>
          </div>
          <div className="text-xl font-bold text-navy">{(pageData.followers || 0).toLocaleString()}</div>
        </div>

        <div className="p-3 bg-gradient-to-br from-gold-50 to-red-100 rounded-lg border border-gold-200">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4 text-gold-600" />
            <span className="text-xs font-medium text-gold-900">J'aime</span>
          </div>
          <div className="text-xl font-bold text-gold-900">{(pageData.likes || 0).toLocaleString()}</div>
        </div>

        <div className="p-3 bg-gradient-to-br from-steel-50 to-steel-100 rounded-lg border border-steel-200">
          <div className="flex items-center gap-2 mb-1">
            <Facebook className="w-4 h-4 text-steel-600" />
            <span className="text-xs font-medium text-steel-900">Suivis</span>
          </div>
          <div className="text-xl font-bold text-steel-900">{pageData.followings || 0}</div>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* About */}
        <Card className="border-cream-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Facebook className="h-4 w-4 text-navy" />
              À propos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {pageData.category && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Catégorie</p>
                <p className="text-base">{pageData.category}</p>
              </div>
            )}
            
            {pageData.intro && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-base">{pageData.intro}</p>
              </div>
            )}

            {pageData.creation_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Créée le</p>
                  <p className="text-base">{pageData.creation_date}</p>
                </div>
              </div>
            )}

            {pageData.business_hours && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Horaires</p>
                  <p className="text-base">{pageData.business_hours}</p>
                </div>
              </div>
            )}

            {pageData.ad_status && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Publicités</p>
                <Badge variant="outline" className="mt-1">
                  {pageData.ad_status}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="border-cream-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Phone className="h-4 w-4 text-green-600" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {pageData.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Adresse</p>
                  <p className="text-base">{pageData.address}</p>
                </div>
              </div>
            )}

            {pageData.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                  <a href={`tel:${pageData.phone}`} className="text-base text-navy hover:underline">
                    {pageData.phone}
                  </a>
                </div>
              </div>
            )}

            {pageData.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <a href={`mailto:${pageData.email}`} className="text-base text-navy hover:underline">
                    {pageData.email}
                  </a>
                </div>
              </div>
            )}

            {pageData.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Site web</p>
                  <a 
                    href={pageData.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-base text-navy hover:underline flex items-center gap-1"
                  >
                    {pageData.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {pageData.websites && pageData.websites.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Autres liens</p>
                <div className="space-y-1">
                  {pageData.websites.map((site, idx) => (
                    <a 
                      key={idx}
                      href={site} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-navy hover:underline flex items-center gap-1 block"
                    >
                      {site}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      {pageData.categories && pageData.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Catégories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pageData.categories.map((cat, idx) => (
                <Badge key={idx} variant="secondary">
                  {cat}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts collapse */}
      {hasPostsAvailable && (
        <Card className="border-navy-100 bg-navy-50/60">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy-500 to-navy-500 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-navy flex items-center gap-1.5">
                  Posts de {pageData.pageName}
                </CardTitle>
                <p className="text-[11px] text-steel">Afficher ou masquer les posts scrapés pour alléger la page.</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-3 border-cream-300 bg-white text-navy text-xs font-medium flex items-center gap-1.5"
              onClick={() => setShowPosts((prev) => !prev)}
            >
              <span>{showPosts ? 'Masquer les posts' : 'Afficher les posts'}</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showPosts ? 'rotate-180' : ''}`}
              />
            </Button>
          </CardHeader>
          {showPosts && (
            <CardContent className="pt-0">
              <div className="mt-3">
                <FacebookPostsView sessionId={sessionId} pageName={pageData.pageName} />
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
