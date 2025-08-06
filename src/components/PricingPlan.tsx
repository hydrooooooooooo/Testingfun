import { Button } from "@/components/ui/button";
import { CheckCircle, Lock, Loader2 } from "lucide-react";

// Type pour l'affichage des plans dans l'interface
export type PricingPlanDisplay = {
  name: string;
  price: string;
  desc: string;
  features: string[];
  cta: string;
  popular: boolean;
  packId: string;
  nbDownloads: number;
  disabled?: boolean;
};

export default function PricingPlan({
  plan,
  onClickPay,
  isLoading = false,
}: {
  plan: PricingPlanDisplay;
  onClickPay: (plan: PricingPlanDisplay) => void;
  isLoading?: boolean;
}) {
  return (
    <div
      className={`relative bg-white border border-border rounded-xl shadow-md flex flex-col gap-4 px-7 py-6 w-full max-w-xs mx-auto
      ${plan.popular ? "ring-2 ring-primary scale-105 z-10" : ""}
      `}
    >
      {plan.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-0.5 rounded-full uppercase text-xs font-black shadow">
          Populaire
        </span>
      )}
      <h3 className="text-xl font-bold text-primary mb-2">{plan.name}</h3>
      <div className="text-3xl font-extrabold mb-1">{plan.price}</div>
      <div className="mb-2 text-muted-foreground">{plan.desc}</div>
      <ul className="space-y-1 text-sm mb-3">
        {plan.features.map(f => (
          <li key={f} className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" /> {f}
          </li>
        ))}
      </ul>
      <Button
        className="mt-auto w-full"
        onClick={() => onClickPay(plan)}
        disabled={plan.disabled || isLoading}
        variant={plan.popular ? "default" : "secondary"}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : plan.cta}
        {plan.disabled && !isLoading && <Lock className="inline-block ml-2 w-4 h-4" />}
      </Button>
    </div>
  );
}
