import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function VerifyEmailSuccess() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-border rounded-2xl shadow-xl p-8 text-center">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-green-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <svg className="h-8 w-8 text-green-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Email vérifié avec succès</h1>
        <p className="text-muted-foreground mb-6">
          Votre adresse email a été confirmée. Vous pouvez maintenant vous connecter et profiter de l'application.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/login"><Button>Se connecter</Button></Link>
          <Link to="/"><Button variant="outline">Retour à l'accueil</Button></Link>
        </div>
      </div>
    </main>
  );
}
