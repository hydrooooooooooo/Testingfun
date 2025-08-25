import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function VerifyEmailError() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const reason = params.get("reason") || "Le lien est invalide ou a expiré.";

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-border rounded-2xl shadow-xl p-8 text-center">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg className="h-8 w-8 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Échec de la vérification</h1>
        <p className="text-muted-foreground mb-6">{reason}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/resend-verification"><Button>Renvoyer l'email</Button></Link>
          <Link to="/"><Button variant="outline">Retour à l'accueil</Button></Link>
        </div>
      </div>
    </main>
  );
}
