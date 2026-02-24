import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Mail, HelpCircle, Clock, MessageSquare,
  AlertCircle, CheckCircle, Users, Shield,
  Zap, ArrowRight, FileText, Search,
  Database, ChevronDown
} from 'lucide-react';
import { useState } from 'react';

const SUPPORT_EMAIL = 'support@easyscrapy.com';

function handleEmailClick() {
  const subject = encodeURIComponent("Support EasyScrapy - Demande d'assistance");
  const body = encodeURIComponent(
`Bonjour,

Je vous contacte concernant :

Nature du problème : [Décrivez votre problème ici]

URL scrappée : [Indiquez l'URL si applicable]

ID de session : [Si vous en avez un : sess_xxxxxx]

Informations supplémentaires :
- Navigateur utilisé :
- Étape où le problème survient :

Merci d'avance pour votre aide !

Cordialement,
[Votre nom]`
  );
  window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

const supportTypes = [
  { icon: Search, label: "Problèmes d'extraction", desc: "Erreurs de scraping, URLs non supportées, configuration" },
  { icon: Database, label: 'Export des données', desc: "Téléchargement, formats de fichiers, données manquantes" },
  { icon: FileText, label: 'Questions facturation', desc: "Paiements, crédits, remboursements, transactions" },
  { icon: Users, label: 'Formation & conseils', desc: "Optimisation, bonnes pratiques, conseils d'usage" },
  { icon: AlertCircle, label: 'Incidents & bugs', desc: "Signalement de bugs, problèmes techniques" },
  { icon: Zap, label: 'Demandes spéciales', desc: "Extractions personnalisées, volumes importants" },
];

const infoItems = [
  { label: 'ID de session', desc: 'Format : sess_xxxxxx (affiché dans vos extractions)' },
  { label: 'URL concernée', desc: "L'adresse que vous tentez de scraper" },
  { label: 'Description précise', desc: "Étapes effectuées et message d'erreur si applicable" },
];

const faqs = [
  {
    q: 'Où trouver mon ID de session ?',
    a: "L'ID de session s'affiche automatiquement pendant et après l'extraction dans votre dashboard, section Extractions. Il commence toujours par sess_.",
  },
  {
    q: "Que faire si mon extraction échoue ?",
    a: "Contactez-nous avec votre ID de session et l'URL problématique. Nous investiguerons rapidement et rembourserons les crédits si l'erreur vient de notre côté.",
  },
  {
    q: 'Comment optimiser mes extractions ?',
    a: "Utilisez des filtres précis sur la plateforme source (localisation, catégorie) et évitez les URLs trop génériques. Pour les pages Facebook, limitez le nombre de pages par session pour de meilleurs résultats.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-cream-300 rounded-xl bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold text-navy text-[15px]">{q}</span>
        <ChevronDown className={`w-4 h-4 text-steel flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-steel text-[14px] leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-cream-50">

      {/* ─── HERO ─── */}
      <section className="relative w-full bg-navy overflow-hidden">
        <div className="absolute top-10 right-20 w-80 h-80 bg-gold/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 left-10 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center">
          <p className="text-gold text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">
            Centre d'aide
          </p>
          <h1 className="font-display text-white text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-5">
            Une question ?
            <span className="block text-gold mt-1">On est là.</span>
          </h1>
          <p className="text-steel text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            Notre équipe vous accompagne pour tirer le meilleur parti d'EasyScrapy
            et résoudre vos problèmes techniques rapidement.
          </p>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            <div className="flex items-center gap-2 text-cream-300 text-[13px]">
              <Clock className="w-4 h-4 text-gold" />
              <span>Réponse sous 24-48h</span>
            </div>
            <div className="flex items-center gap-2 text-cream-300 text-[13px]">
              <Users className="w-4 h-4 text-gold" />
              <span>Équipe dédiée</span>
            </div>
            <div className="flex items-center gap-2 text-cream-300 text-[13px]">
              <Shield className="w-4 h-4 text-gold" />
              <span>Support expert</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CONTACT CARD ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10 mb-16">
        <Card className="bg-white border-cream-300 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-2">
              {/* Left — email CTA */}
              <div className="bg-navy p-8 sm:p-10 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gold/15 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-gold" />
                  </div>
                  <h2 className="text-white text-xl font-bold">Contactez-nous</h2>
                </div>
                <p className="text-steel text-[14px] leading-relaxed mb-6">
                  Pour toute question technique, problème d'extraction ou demande d'assistance.
                </p>
                <button
                  onClick={handleEmailClick}
                  className="text-gold text-lg sm:text-xl font-bold hover:text-white transition-colors mb-6 text-left"
                >
                  {SUPPORT_EMAIL}
                </button>
                <Button
                  onClick={handleEmailClick}
                  className="h-12 bg-gold text-navy font-bold hover:bg-gold/90 rounded-xl w-fit"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Envoyer un email
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Right — info to include */}
              <div className="p-8 sm:p-10">
                <div className="flex items-center gap-2 mb-5">
                  <MessageSquare className="w-5 h-5 text-navy" />
                  <h3 className="text-navy font-bold text-lg">Pour un traitement rapide</h3>
                </div>
                <p className="text-steel text-[13px] mb-5">
                  Incluez ces informations dans votre message :
                </p>
                <div className="space-y-3">
                  {infoItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-cream-50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-navy text-[13px] font-semibold">{item.label}</p>
                        <p className="text-steel text-[12px]">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ─── SUPPORT TYPES ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="text-center mb-10">
          <h2 className="text-navy text-2xl sm:text-3xl font-bold mb-3">On vous aide sur tout</h2>
          <p className="text-steel text-base max-w-xl mx-auto">
            Technique, facturation, conseils — notre équipe couvre tous les aspects.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {supportTypes.map((st, i) => (
            <Card key={i} className="bg-white border-cream-300 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="w-10 h-10 bg-navy/5 rounded-xl flex items-center justify-center mb-3">
                  <st.icon className="w-5 h-5 text-navy" />
                </div>
                <h3 className="text-navy font-bold text-[14px] mb-1">{st.label}</h3>
                <p className="text-steel text-[12px] leading-relaxed">{st.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="text-center mb-8">
          <h2 className="text-navy text-2xl font-bold mb-3">Questions fréquentes</h2>
          <p className="text-steel text-[14px]">Consultez ces réponses avant de nous contacter</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FaqItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ─── CTA FOOTER ─── */}
      <section className="relative w-full bg-navy overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gold/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-20 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
          <h2 className="font-display text-white text-2xl sm:text-3xl font-bold mb-4">
            Besoin d'aide maintenant ?
          </h2>
          <p className="text-steel text-base max-w-xl mx-auto mb-8">
            Envoyez-nous un email — on vous répond sous 24 à 48 heures maximum.
          </p>
          <Button
            onClick={handleEmailClick}
            className="h-12 px-8 bg-gold text-navy font-bold text-[15px] hover:bg-gold/90 transition-all shadow-lg hover:shadow-xl rounded-xl"
          >
            <Mail className="w-4 h-4 mr-2" />
            {SUPPORT_EMAIL}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}
