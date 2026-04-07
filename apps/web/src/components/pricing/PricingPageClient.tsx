"use client";

import { useState } from "react";
import Link from "next/link";
import type { Model } from "@ai-gateway/shared-types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { showNotification } from "@/store/slices/notificationSlice";
import { useTranslation } from "@/hooks/useTranslation";
import type { PricingReference } from "@/services/pricing/pricing-reference.service";
import { formatPricePerMillion } from "@/utils/modelPricing";

export default function PricingPageClient({
  pricingModels,
  pricingReference,
}: {
  pricingModels: Model[];
  pricingReference: PricingReference;
}) {
  const dispatch = useAppDispatch();
  const t = useTranslation();
  const locale = useAppSelector((state) => state.locale.locale);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const copyKey = locale === "en" ? "en" : "zh";

  const localizedPlans = pricingReference.plans.map((plan) => ({
    ...plan,
    name: plan.name[copyKey],
    desc: plan.desc[copyKey],
    price: plan.price[copyKey],
    unit: plan.unit[copyKey],
    cta: plan.cta[copyKey],
    badge: plan.badge?.[copyKey],
    features: plan.features.map((feature) => feature[copyKey]),
  }));
  const localizedFaqs = pricingReference.faqs.map((faq) => ({
    key: faq.key,
    q: faq.question[copyKey],
    a: faq.answer[copyKey],
  }));
  const localizedRails = pricingReference.rails.map((rail) => ({
    key: rail.key,
    label: rail.label[copyKey],
    value: rail.value[copyKey],
  }));
  const localizedRules = pricingReference.rules.map((rule) => ({
    key: rule.key,
    title: rule.title[copyKey],
    body: rule.body[copyKey],
  }));
  const localizedExamples = pricingReference.examples.map((example) => ({
    key: example.key,
    title: copyKey === "zh" ? example.titleZh : example.titleEn,
    value: example.value,
    body: copyKey === "zh" ? example.bodyZh : example.bodyEn,
  }));

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-0 inset-x-0 h-[500px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60"></div>
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <section className="section-shell mb-16 sm:mb-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_380px] lg:items-end">
            <div className="space-y-6">
              <span className="eyebrow inline-flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                <span className="text-primary font-medium tracking-wider">{t.pricingPage.eyebrow}</span>
              </span>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight leading-[1.1] text-text-primary sm:text-5xl lg:text-6xl">
                {t.pricingPage.title}
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl">
                {t.pricingPage.subtitle}
              </p>
            </div>

            <div className="editorial-panel p-6 sm:p-8 bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl border-border">
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-text-secondary mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                {t.pricingPage.acceptedRails}
              </div>
              <div className="mt-4 space-y-4">
                {localizedRails.map((rail) => (
                  <div key={rail.key} className="rounded-2xl border border-border/60 bg-dark-light/30 p-5 hover:bg-white hover:border-primary/30 transition-all duration-300">
                    <div className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-text-secondary">
                      {rail.label}
                    </div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
                      {rail.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16 sm:mb-24 grid gap-6 lg:grid-cols-3">
          {localizedPlans.map((plan, index) => (
            <article
              key={plan.key}
              className={`relative flex flex-col overflow-hidden rounded-[2.5rem] border p-8 sm:p-10 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl ${
                plan.featured
                  ? "border-primary/40 bg-gradient-to-b from-primary/5 to-white ring-1 ring-primary/20 shadow-lg shadow-primary/5"
                  : index === 2
                    ? "border-border bg-gradient-to-b from-dark-light/50 to-white"
                    : "border-border bg-white"
              }`}
            >
              {plan.featured && plan.badge ? (
                <div className="absolute right-6 top-6 rounded-full bg-primary px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white shadow-sm">
                  {plan.badge}
                </div>
              ) : null}
              <div className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-text-secondary inline-block bg-dark-light/50 self-start px-2.5 py-1 rounded-md mb-4">{plan.name}</div>
              <p className="min-h-[60px] text-sm leading-relaxed text-text-secondary">
                {plan.desc}
              </p>
              <div className="mt-6 flex items-end gap-2 border-b border-border/60 pb-6">
                <span className="text-5xl font-bold tracking-tight text-text-primary">
                  {plan.price}
                </span>
                {plan.unit ? (
                  <span className="pb-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-text-secondary">
                    {plan.unit}
                  </span>
                ) : null}
              </div>
              <div className="mt-8 space-y-4 flex-1">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 text-sm text-text-primary"
                  >
                    <span className="flex-shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <i className="fas fa-check text-[10px]" />
                    </span>
                    <span className="leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="pt-8 mt-auto">
                {plan.href === "/contact" ? (
                  <Link
                    href={plan.href}
                    className={`btn-${plan.featured ? 'primary' : 'secondary'} w-full justify-center no-underline rounded-full py-3 hover:-translate-y-0.5 transition-transform`}
                  >
                    {plan.cta}
                  </Link>
                ) : plan.href ? (
                  <Link
                    href={plan.href}
                    className={`btn-${plan.featured ? 'primary' : 'secondary'} w-full justify-center no-underline rounded-full py-3 hover:-translate-y-0.5 transition-transform`}
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    className={`btn-${plan.featured ? 'primary' : 'secondary'} w-full justify-center rounded-full py-3 hover:-translate-y-0.5 transition-transform`}
                    onClick={() =>
                      dispatch(
                        showNotification({
                          message: t.pricingPage.contactSalesToast,
                          type: "error",
                        }),
                      )
                    }
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="mb-16 sm:mb-24 grid gap-6 lg:grid-cols-3">
          {localizedExamples.map((example) => (
            <div key={example.key} className="editorial-panel rounded-[2rem] p-6 sm:p-8 bg-white border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-text-secondary inline-block bg-dark-light/50 px-2 py-1 rounded-md">
                {example.title}
              </div>
              <div className="mt-4 text-3xl font-bold tracking-tight text-text-primary">
                {example.value}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {example.body}
              </p>
            </div>
          ))}
        </section>

        <section className="section-shell mb-16 sm:mb-24">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="eyebrow inline-block bg-white px-3 py-1 rounded-full border border-border shadow-sm mb-4">{t.pricingPage.modelRates}</span>
              <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                {t.pricingPage.rateTableTitle}
              </h2>
            </div>
            <p className="max-w-xl text-base leading-relaxed text-text-secondary">
              {t.pricingPage.rateTableDesc}
            </p>
          </div>

          <div className="overflow-x-auto rounded-[2rem] border border-border bg-white shadow-sm">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] border-b border-border/60 bg-dark-light/30 px-6 py-4 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-text-secondary">
                <div>{t.pricingPage.model}</div>
                <div>{t.pricingPage.provider}</div>
                <div>{t.pricingPage.inputPrice}</div>
                <div>{t.pricingPage.outputPrice}</div>
              </div>
              <div className="divide-y divide-border/40">
                {pricingModels.map((model) => (
                  <div
                    key={model.id}
                    className="grid grid-cols-[1.5fr_1fr_1fr_1fr] items-center px-6 py-4 text-sm hover:bg-dark-light/10 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-text-primary">
                        {model.model_name}
                      </div>
                      <div className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-secondary font-mono">
                        {model.id}
                      </div>
                    </div>
                    <div className="font-medium text-text-secondary">{model.provider}</div>
                    <div className="font-bold text-primary font-mono text-[0.95rem]">
                      {formatPricePerMillion(model.input_price)}
                    </div>
                    <div className="font-bold text-secondary font-mono text-[0.95rem]">
                      {formatPricePerMillion(model.output_price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16 sm:mb-24 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 bg-white/60 p-6 sm:p-10 rounded-[2.5rem] border border-border shadow-sm backdrop-blur-sm">
          <div className="space-y-6">
            <div>
              <span className="eyebrow inline-block bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 mb-4">{t.pricingPage.procurementNotes}</span>
              <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                {t.pricingPage.procurementTitle}
              </h2>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-text-secondary">
              <p>{t.pricingPage.procurementBody1}</p>
              <p>{t.pricingPage.procurementBody2}</p>
            </div>
            <div className="mt-8 space-y-4">
              {localizedRules.map((rule) => (
                <div key={rule.key} className="rounded-[1.5rem] border border-border/80 bg-white p-5 shadow-sm hover:border-primary/20 transition-colors">
                  <div className="text-base font-bold text-text-primary flex items-center gap-2">
                    <i className="fas fa-info-circle text-primary/70" />
                    {rule.title}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {rule.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 lg:mt-0 mt-8">
            <h3 className="text-xl font-bold mb-6 tracking-tight text-text-primary px-2">常见问题 / FAQ</h3>
            {localizedFaqs.map((faq, index) => (
              <button
                key={faq.key}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full rounded-[1.5rem] border border-border bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30 group"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold text-text-primary group-hover:text-primary transition-colors">
                    {faq.q}
                  </span>
                  <i
                    className={`fas fa-chevron-down text-text-secondary transition-transform duration-300 ${
                      openFaq === index ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </div>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {faq.a}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
