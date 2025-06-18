
import React from "react";
import Layout from "@/components/Layout";
import PricingSupportSection from "@/components/PricingSupportSection";

export default function SupportPage() {
  return (
    <Layout>
      <section className="mx-auto w-full max-w-2xl my-16 px-2">
        <h1 className="text-4xl font-extrabold text-primary text-center mb-6">
          Support
        </h1>
        <PricingSupportSection />
      </section>
    </Layout>
  );
}
