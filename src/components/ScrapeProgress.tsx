
import React from "react";
import { Progress } from "@/components/ui/progress";

type ScrapeProgressProps = {
  percent: number;
  stepLabel?: string;
};

export default function ScrapeProgress({ percent, stepLabel }: ScrapeProgressProps) {
  return (
    <div className="my-6 space-y-2 w-full max-w-lg mx-auto">
      <Progress value={percent} className="w-full h-5" />
      <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
        <span>
          {stepLabel || (percent < 100 ? "En cours..." : "Terminé !")}
        </span>
        <span className="text-primary font-bold">{Math.round(percent)}%</span>
      </div>
    </div>
  );
}
