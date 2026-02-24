import React from 'react';
import { SessionStats } from '@/types/scrapedItems';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, MapPin, Heart, Package, DollarSign } from 'lucide-react';

interface SessionStatsPanelProps {
  stats: SessionStats;
  sessionUrl?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const SessionStatsPanel: React.FC<SessionStatsPanelProps> = ({ stats, sessionUrl }) => {
  const locationData = stats.locations.slice(0, 5);
  const typeData = Object.entries(stats.itemTypes).map(([name, value]) => ({
    name: name === 'vehicle' ? 'Véhicules' : name === 'real_estate' ? 'Immobilier' : 'Marketplace',
    value,
  }));

  return (
    <div className="space-y-4">
      {/* Cartes de statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-navy-50 to-navy-100 border-navy-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy">Total d'items</p>
                <p className="text-3xl font-bold text-navy">{stats.total}</p>
              </div>
              <Package className="w-12 h-12 text-navy opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Favoris</p>
                <p className="text-3xl font-bold text-red-900">{stats.favorites}</p>
              </div>
              <Heart className="w-12 h-12 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Prix moyen</p>
                <p className="text-2xl font-bold text-green-900">
                  {stats.priceRange.avg > 0
                    ? `${Math.round(stats.priceRange.avg).toLocaleString()} Ar`
                    : 'N/A'}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-steel-50 to-steel-100 border-steel-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-steel-600">Localisations</p>
                <p className="text-3xl font-bold text-steel-900">{stats.locations.length}</p>
              </div>
              <MapPin className="w-12 h-12 text-steel-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top localisations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Top 5 Localisations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={locationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-steel py-8">Aucune donnée disponible</p>
            )}
          </CardContent>
        </Card>

        {/* Répartition par type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Répartition par type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-steel py-8">Aucune donnée disponible</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fourchette de prix */}
      {stats.priceRange.min > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Fourchette de prix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="text-sm text-steel">Minimum</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round(stats.priceRange.min).toLocaleString()} Ar
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-steel">Moyenne</p>
                <p className="text-2xl font-bold text-navy">
                  {Math.round(stats.priceRange.avg).toLocaleString()} Ar
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-steel">Maximum</p>
                <p className="text-2xl font-bold text-red-600">
                  {Math.round(stats.priceRange.max).toLocaleString()} Ar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* URL de la session */}
      {sessionUrl && (
        <Card className="bg-cream-50">
          <CardContent className="pt-6">
            <p className="text-sm text-steel mb-2">URL scrapée :</p>
            <Badge variant="outline" className="text-xs break-all">
              {sessionUrl}
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SessionStatsPanel;
