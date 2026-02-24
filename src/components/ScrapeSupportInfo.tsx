
import React from "react";

type Props = {
  sessionId: string;
  datasetId: string;
  stats?: {
    nbItems: number;
    startedAt: string;
    finishedAt?: string;
  };
};

export default function ScrapeSupportInfo({ sessionId, datasetId, stats }: Props) {
  return (
    <div className="w-full max-w-lg mx-auto bg-card rounded-xl border border-accent shadow flex flex-col gap-2 px-6 py-4 mt-6 mb-1 animate-fade-in">
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-sm text-primary">ID Session scraping :</span>
        <span className="font-mono text-navy/80 text-xs">{sessionId}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-sm text-primary">ID Dataset :</span>
        <span className="font-mono text-navy/80 text-xs">{datasetId}</span>
      </div>
      {stats && (
        <>
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-sm text-primary">Nombre d’annonces :</span>
            <span className="text-sm font-mono">{stats.nbItems}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-sm text-primary">Début scraping :</span>
            <span className="text-xs font-mono">{stats.startedAt}</span>
          </div>
          {stats.finishedAt && (
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-sm text-primary">Fin scraping :</span>
              <span className="text-xs font-mono">{stats.finishedAt}</span>
            </div>
          )}
        </>
      )}
      <div className="pt-2 flex flex-row items-center gap-2">
        <span className="text-xs text-muted-foreground">Besoin d’aide ? Envoyez ces identifiants au support pour un diagnostic rapide.</span>
      </div>
    </div>
  );
}
