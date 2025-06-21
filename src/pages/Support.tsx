import React from "react";
import Layout from "@/components/Layout";
import { Mail, HelpCircle, Clock, MessageSquare, AlertCircle, CheckCircle } from "lucide-react";

export default function SupportPage() {
  return (
    <Layout>
      <div className="bg-gradient-to-br from-muted/30 via-background to-muted/30 min-h-screen">
        <section className="mx-auto w-full max-w-4xl py-16 px-4 flex flex-col gap-12">
          
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-full text-sm font-medium">
              <HelpCircle className="w-4 h-4" />
              Centre d'aide et support
            </div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold text-foreground leading-tight">
              Support{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                technique
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Notre équipe d'experts est là pour vous accompagner dans l'utilisation 
              d'EasyScrapyMG et résoudre tous vos problèmes techniques.
            </p>
          </div>

          {/* Contact Card */}
          <div className="grid gap-8 grid-cols-1">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 bg-card border border-border rounded-2xl shadow-sm">
              <div className="p-6 text-center space-y-6">
                <div className="flex items-center justify-center gap-3">
                  <Mail className="text-primary w-8 h-8" />
                  <h2 className="text-2xl font-bold text-foreground">Support Email</h2>
                </div>
                
                <p className="text-muted-foreground">
                  Pour toute question technique, problème d'extraction ou demande d'assistance.
                </p>
                
                <div className="bg-card rounded-xl p-4 border border-border">
                  <a 
                    href="mailto:support@easyscrapymg.com" 
                    className="text-primary font-bold text-lg hover:underline"
                  >
                    support@easyscrapymg.com
                  </a>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Réponse sous 48h maximum</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Support technique spécialisé</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Support Guidelines */}
          <div className="bg-card rounded-2xl shadow-sm border border-border">
            <div className="p-6 space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center justify-center gap-2">
                  <MessageSquare className="w-6 h-6 text-primary" />
                  Comment nous contacter efficacement
                </h3>
                <p className="text-muted-foreground">
                  Pour un traitement plus rapide de votre demande, suivez ces recommandations.
                </p>
              </div>
              
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    Informations à inclure
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>ID scraping</strong> (ex: scrape_xxxxxx)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>ID Dataset</strong> (ex: ds_xxxxxx)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Description précise du problème</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>URL que vous tentez de scraper</span>
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Délais de réponse
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span><strong>Support technique :</strong> 24-48h</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span><strong>Questions générales :</strong> 24h</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  <strong>Note :</strong> Les identifiants scraping et dataset sont affichés lors de l'extraction sur la page d'accueil.
                  <br />
                  <span className="font-mono text-xs bg-background px-2 py-1 rounded">
                    Exemple : scrape_abc123 – ds_def456
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-card rounded-2xl shadow-sm border border-border">
            <div className="p-6 space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Questions Fréquentes
                </h3>
                <p className="text-muted-foreground">
                  Trouvez rapidement des réponses aux questions les plus courantes.
                </p>
              </div>
              
              <div className="space-y-4">
                <details className="bg-muted rounded-xl p-4 cursor-pointer">
                  <summary className="font-semibold text-foreground">
                    Combien de temps prend une extraction ?
                  </summary>
                  <p className="text-muted-foreground mt-2 text-sm">
                    La plupart des extractions sont terminées en 2-5 minutes. 
                    Pour de gros volumes (500+ éléments), cela peut prendre jusqu'à 15 minutes.
                  </p>
                </details>
                
                <details className="bg-muted rounded-xl p-4 cursor-pointer">
                  <summary className="font-semibold text-foreground">
                    Les extractions expirent-elles ?
                  </summary>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Non, vos extractions n'expirent jamais. 
                    Vous pouvez les utiliser quand vous voulez, au rythme qui vous convient.
                  </p>
                </details>
                
                <details className="bg-muted rounded-xl p-4 cursor-pointer">
                  <summary className="font-semibold text-foreground">
                    Comment payer par Mobile Banking ?
                  </summary>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Rendez-vous sur la page Tarifs et remplissez le formulaire Mobile Banking 
                    avec votre référence de transaction et les détails de votre recherche.
                  </p>
                </details>
                
                <details className="bg-muted rounded-xl p-4 cursor-pointer">
                  <summary className="font-semibold text-foreground">
                    Que faire si mon extraction échoue ?
                  </summary>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Contactez-nous avec votre ID scraping et l'URL problématique. 
                    Nous investiguerons et rembourserons les extractions si nécessaire.
                  </p>
                </details>
              </div>
            </div>
          </div>

        </section>
      </div>
    </Layout>
  );
}