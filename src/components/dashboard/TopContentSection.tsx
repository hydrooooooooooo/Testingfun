import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp,
  Facebook,
  ShoppingBag,
  ThumbsUp,
  MessageCircle,
  Share2,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopContentItem {
  id: string;
  rank: number;
  platform: 'facebook' | 'marketplace';
  name: string;
  metrics: {
    engagement?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
}

interface TopContentSectionProps {
  items: TopContentItem[];
  className?: string;
}

const TopContentSection: React.FC<TopContentSectionProps> = ({ items, className }) => {
  const facebookItems = items.filter(i => i.platform === 'facebook');
  const marketplaceItems = items.filter(i => i.platform === 'marketplace');

  const getRankBadge = (rank: number) => {
    const colors = {
      1: 'bg-gradient-to-r from-gold-400 to-yellow-400 text-gold-900',
      2: 'bg-gradient-to-r from-steel-200 to-steel-200 text-navy',
      3: 'bg-gradient-to-r from-gold-400 to-gold-600 text-gold-900'
    };
    return colors[rank as keyof typeof colors] || 'bg-steel-700 text-steel-200';
  };

  const ContentList = ({ contentItems }: { contentItems: TopContentItem[] }) => {
    if (contentItems.length === 0) {
      return (
        <div className="text-center py-8 text-steel text-sm">
          Aucune donnée disponible
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {contentItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 p-4 rounded-lg bg-white border border-cream-300 hover:border-gold-300 hover:shadow-md transition-all"
          >
            <Badge 
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm border-0 flex-shrink-0",
                getRankBadge(item.rank)
              )}
            >
              #{item.rank}
            </Badge>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-cream-300 text-steel">
                  {item.platform === 'facebook' ? 'FACEBOOK' : 'MARKETPLACE'}
                </Badge>
              </div>
              <p className="font-medium text-sm text-navy truncate">{item.name}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-steel">
              {item.metrics.engagement !== undefined && (
                <div className="text-center">
                  <div className="font-bold text-navy">{item.metrics.engagement.toLocaleString()}</div>
                  <div className="uppercase text-[10px]">Engagement</div>
                </div>
              )}
              {item.metrics.likes !== undefined && (
                <div className="text-center">
                  <div className="font-bold text-navy">{item.metrics.likes.toLocaleString()}</div>
                  <div className="uppercase text-[10px]">Likes</div>
                </div>
              )}
              {item.metrics.comments !== undefined && (
                <div className="text-center">
                  <div className="font-bold text-navy">{item.metrics.comments.toLocaleString()}</div>
                  <div className="uppercase text-[10px]">Commentaires</div>
                </div>
              )}
              {item.metrics.shares !== undefined && (
                <div className="text-center">
                  <div className="font-bold text-navy">{item.metrics.shares.toLocaleString()}</div>
                  <div className="uppercase text-[10px]">Partages</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-navy">
          Top contenus analysés
        </h3>
        <Tabs defaultValue="all" className="w-auto">
          <TabsList className="bg-cream-100 border border-cream-300">
            <TabsTrigger value="all" className="text-xs data-[state=active]:bg-gold-500 data-[state=active]:text-white">
              Cette semaine
            </TabsTrigger>
            <TabsTrigger value="month" className="text-xs data-[state=active]:bg-gold-500 data-[state=active]:text-white">
              Ce mois
            </TabsTrigger>
            <TabsTrigger value="all-time" className="text-xs data-[state=active]:bg-gold-500 data-[state=active]:text-white">
              Tout
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ContentList contentItems={items} />
    </div>
  );
};

export default TopContentSection;
