
import React from "react";
import { Pack } from "@/lib/plans";

type Props = {
  selectedPack: Pack;
};

export default function SelectedPackInfos({ selectedPack }: Props) {
  return (
    <div className="w-full mt-2 flex flex-col items-center">
      <div className="flex flex-col items-center mb-1">
        <span className="text-base font-bold text-primary">{selectedPack.name}</span>
        <span className="text-lg font-extrabold text-green-700">{selectedPack.priceLabel}</span>
      </div>
      <span className="text-xs text-muted-foreground font-sans text-center">{selectedPack.description}</span>
    </div>
  )
}
