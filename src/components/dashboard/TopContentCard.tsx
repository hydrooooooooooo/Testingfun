import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface TopContent {
  id: string;
  rank: number;
  platform: 'facebook' | 'marketplace';
  name: string;
  metrics: {
    engagements?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
}

interface TopContentCardProps {
  topContent: TopContent[];
  className?: string;
}

const TopContentCard: React.FC<TopContentCardProps> = ({ topContent, className }) => {
  const facebookContent = topContent.filter(c => c.platform === 'facebook');
  const marketplaceContent = topContent.filter(c => c.platform === 'marketplace');

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-gold-400 to-yellow-400 text-gold-900';
    if (rank === 2) return 'bg-gradient-to-r from-steel-200 to-steel-200 text-navy';
    if (rank === 3) return 'bg-gradient-to-r from-gold-400 to-gold-600 text-gold-900';
    return 'bg-cream-100 text-navy-700';
  };

  const ContentList = ({ items }: { items: TopContent[] }) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Aucune donnée disponible
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
          >
            <Badge 
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm border-0",
                getRankBadgeColor(item.rank)
              )}
            >
              #{item.rank}
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{item.name}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {item.metrics.engagements !== undefined && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {item.metrics.engagements.toLocaleString()}
                  </span>
                )}
                {item.metrics.likes !== undefined && (
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {item.metrics.likes.toLocaleString()}
                  </span>
                )}
                {item.metrics.comments !== undefined && (
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {item.metrics.comments.toLocaleString()}
                  </span>
                )}
                {item.metrics.shares !== undefined && (
                  <span className="flex items-center gap-1">
                    <Share2 className="h-3 w-3" />
                    {item.metrics.shares.toLocaleString()}
                  </span>
                )}
                {item.metrics.views !== undefined && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {item.metrics.views.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={cn("border-0 shadow-sm", className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Top contenus analysés
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Tout</TabsTrigger>
            <TabsTrigger value="facebook">
              <Facebook className="h-4 w-4 mr-1" />
              Facebook
            </TabsTrigger>
            <TabsTrigger value="marketplace">
              <ShoppingBag className="h-4 w-4 mr-1" />
              Marketplace
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <ContentList items={topContent} />
          </TabsContent>
          <TabsContent value="facebook" className="mt-4">
            <ContentList items={facebookContent} />
          </TabsContent>
          <TabsContent value="marketplace" className="mt-4">
            <ContentList items={marketplaceContent} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TopContentCard;
