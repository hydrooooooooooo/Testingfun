import React from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileSpreadsheet, 
  Download, 
  Eye, 
  Sparkles, 
  Database, 
  BarChart3,
  Home,
  Building,
  Car,
  ShoppingBag,
  ArrowRight
} from "lucide-react";

export default function ModelsPage() {
  const exampleFiles = [
    {
      id: "immobilier-location",
      title: "Annonces de location immobilière",
      description: "Exemple d'extraction d'annonces de location sur Facebook Marketplace - secteur Antananarivo",
      category: "Immobilier",
      icon: <Home className="w-6 h-6 text-blue-600" />,
      features: [
        "150+ annonces extraites",
        "Prix, localisation, superficie",
        "Photos et descriptions",
        "Coordonnées des propriétaires"
      ],
      previewUrl: "#", // Sera remplacé par le vrai lien
      downloadUrl: "#", // Sera remplacé par le vrai lien
      bgColor: "from-blue-50 to-blue-100",
      borderColor: "border-blue-200"
    },
    {
      id: "immobilier-vente",
      title: "Biens immobiliers à vendre",
      description: "Dataset complet de maisons et terrains à vendre avec analyse des prix du marché",
      category: "Immobilier", 
      icon: <Building className="w-6 h-6 text-green-600" />,
      features: [
        "200+ biens à vendre",
        "Analyse des prix au m²",
        "Répartition géographique",
        "Type de biens et surfaces"
      ],
      previewUrl: "#",
      downloadUrl: "#",
      bgColor: "from-green-50 to-green-100",
      borderColor: "border-green-200"
    },
    {
      id: "vehicules",
      title: "Marché automobile",
      description: "Véhicules d'occasion sur Facebook Marketplace avec détails techniques et prix",
      category: "Automobile",
      icon: <Car className="w-6 h-6 text-purple-600" />,
      features: [
        "100+ véhicules analysés",
        "Marques, modèles, années",
        "Kilométrage et état",
        "Tendances des prix"
      ],
      previewUrl: "#",
      downloadUrl: "#", 
      bgColor: "from-purple-50 to-purple-100",
      borderColor: "border-purple-200"
    },
    {
      id: "marketplace-general",
      title: "Marketplace général",
      description: "Exemple d'extraction multi-catégories : électronique, mobilier, vêtements",
      category: "Commerce",
      icon: <ShoppingBag className="w-6 h-6 text-orange-600" />,
      features: [
        "Données multi-catégories",
        "Classification automatique",
        "Analyse des tendances",
        "État et prix des produits"
      ],
      previewUrl: "#",
      downloadUrl: "#",
      bgColor: "from-orange-50 to-orange-100", 
      borderColor: "border-orange-200"
    }
  ];

  const dataColumns = [
    {
      name: "Titre",
      description: "Titre complet de l'annonce",
      example: "Appartement F3 meublé Antananarivo"
    },
    {
      name: "Prix", 
      description: "Prix affiché (nettoyé et formaté)",
      example: "850 000 Ar"
    },
    {
      name: "Description",
      description: "Description complète de l'annonce",
      example: "Bel appartement moderne avec vue..."
    },
    {
      name: "Localisation",
      description: "Lieu géographique précis",
      example: "Antananarivo, Ivandry"
    },
    {
      name: "URL",
      description: "Lien direct vers l'annonce",
      example: "https://facebook.com/marketplace/item/..."
    },
    {
      name: "Images",
      description: "URLs des photos (séparées par ;)",
      example: "https://scontent.xx.fbcdn.net/..."
    },
    {
      name: "Date",
      description: "Date de publication",
      example: "2024-01-15"
    },
    {
      name: "Attributs",
      description: "Caractéristiques spécifiques",
      example: "3 pièces, 85m², meublé"
    }
  ];

  return (
    <Layout>
      <div className="bg-gradient-to-br from-muted/30 via-background to-muted/30 min-h-screen">
        
        {/* Hero Section */}
        <section className="mx-auto w-full max-w-6xl py-16 px-4">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Exemples de fichiers générés
            </div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold text-foreground leading-tight">
              Modèles de{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                données
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Découvrez la qualité et la structure de nos extractions de données ! 
              Ces exemples vous montrent exactement ce que vous obtiendrez avec EasyScrapyMG.
            </p>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-3 mb-3">
                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                <span className="font-semibold text-gray-900">Format Excel professionnel</span>
              </div>
              <p className="text-sm text-gray-600 text-center">
                Tous nos fichiers sont optimisés pour Excel, Google Sheets et vos outils d'analyse préférés
              </p>
            </div>
          </div>
        </section>

        {/* Exemples de fichiers */}
        <section className="mx-auto w-full max-w-7xl px-4 mb-16">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            {exampleFiles.map((file) => (
              <Card key={file.id} className={`relative overflow-hidden border-2 ${file.borderColor} hover:shadow-xl transition-all duration-300`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${file.bgColor} opacity-50`}></div>
                
                <CardHeader className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {file.icon}
                      <div>
                        <CardTitle className="text-xl font-bold text-foreground mb-1">
                          {file.title}
                        </CardTitle>
                        <span className="inline-block bg-white/80 text-xs font-medium px-2 py-1 rounded-full text-gray-700">
                          {file.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mt-3 leading-relaxed">
                    {file.description}
                  </p>
                </CardHeader>

                <CardContent className="relative z-10">
                  {/* Features */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Contenu du fichier
                    </h4>
                    <ul className="space-y-2">
                      {file.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(file.previewUrl, '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Aperçu
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(file.downloadUrl, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>

                  <div className="mt-4 text-center">
                    <span className="text-xs text-muted-foreground bg-white/70 px-2 py-1 rounded-full">
                      Fichier de démonstration • Données réelles anonymisées
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Structure des données */}
        <section className="mx-auto w-full max-w-6xl px-4 mb-16">
          <Card className="border-2 border-gray-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                Structure standard des données
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Chaque fichier Excel contient ces colonnes standardisées pour une analyse optimale
              </p>
            </CardHeader>
            
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {dataColumns.map((column, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{column.name}</h4>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        Colonne {index + 1}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {column.description}
                    </p>
                    <div className="bg-white rounded p-2 border">
                      <code className="text-xs text-blue-600 font-mono">
                        {column.example}
                      </code>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-green-600" />
                    Données prêtes à l'emploi
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Toutes les données sont nettoyées, formatées et optimisées pour vos analyses.
                    Compatible avec Excel, Google Sheets, Power BI, Tableau et tous vos outils favoris.
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Données validées
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Format standardisé
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Prêt pour analyse
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Call to action */}
        <section className="mx-auto w-full max-w-4xl px-4 mb-16">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="py-12 px-8 text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Prêt à créer vos propres extractions ?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Commencez dès maintenant et obtenez des données de la même qualité 
                que nos exemples pour vos projets.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="text-lg px-8" onClick={() => window.location.href = '/#scraping-form'}>
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Commencer une extraction
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8" onClick={() => window.location.href = '/pricing'}>
                  Voir les tarifs
                </Button>
              </div>
              
              <div className="mt-6 text-sm text-muted-foreground">
                Aperçu gratuit • Aucun engagement • Paiement sécurisé
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
}