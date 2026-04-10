"use client";

import Link from "next/link";
import type { Model } from "@ai-gateway/shared-types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { copyToClipboard } from "@/utils/helpers";
import { formatPricePerMillion } from "@/utils/modelPricing";
import { showNotification } from "@/store/slices/notificationSlice";
import {
  categoryStyles,
  formatContextLength,
  getLocalizedCapabilityTags,
  getLocalizedModelDescription,
} from "@/components/models/modelCatalog";

export default function ModelDetailPageClient({ model }: { model: Model }) {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.locale.locale);
  const t = useTranslation();

  const categoryNames: Record<string, string> = {
    text: t.modelsPage.categoryText,
    image: t.modelsPage.categoryImage,
    audio: t.modelsPage.categoryAudio,
    video: t.modelsPage.categoryVideo,
    embedding: t.modelsPage.categoryEmbedding,
  };

  const defaultCapabilityTags: Record<string, string[]> = {
    text: [t.modelsPage.tagGeneral, t.modelsPage.tagChat],
    image: [t.modelsPage.tagImageGeneration, t.modelsPage.tagCreative],
    audio: [t.modelsPage.tagGeneral],
    video: [t.modelsPage.tagGeneral],
    embedding: [t.modelsPage.tagEmbedding, t.modelsPage.tagRetrieval],
  };

  const description = getLocalizedModelDescription(model, locale);
  const capabilityTags = getLocalizedCapabilityTags(
    model,
    locale,
    defaultCapabilityTags,
    t.modelsPage.genericAccess,
  );

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-0 inset-x-0 h-[520px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-3 sm:px-4 md:px-6 py-8 sm:py-12 md:py-20">
        <section className="section-shell mb-6 sm:mb-8 md:mb-10">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[0.7rem] sm:text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
            <Link
              href="/models"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1.5 no-underline transition-colors hover:border-primary/30 hover:text-primary"
            >
              <i className="fas fa-arrow-left" />
              {t.modelsPage.backToCatalog}
            </Link>
            <span>/</span>
            <span>{model.model_name}</span>
          </div>

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.1fr)_380px] xl:items-start">
            <div className="space-y-5 sm:space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] ${categoryStyles[model.category] || categoryStyles.embedding}`}
                >
                  {categoryNames[model.category] || t.modelsPage.generic}
                </span>
                <span className="rounded-full border border-border bg-white/80 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-text-secondary">
                  {model.provider}
                </span>
                <span className="rounded-full border border-success/30 bg-success/15 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-success">
                  {t.modelsPage.catalogReady}
                </span>
              </div>

              <div className="max-w-4xl space-y-3 sm:space-y-4">
                <h1 className="text-[2.1rem] font-bold tracking-tight leading-[1.05] sm:text-[2.6rem] md:text-5xl text-text-primary">
                  {model.model_name}
                </h1>
                <p className="text-[0.95rem] sm:text-base md:text-xl leading-relaxed text-text-secondary">
                  {description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                {capabilityTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-white/80 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  href={`/playground?model=${model.id}`}
                  className="btn-primary btn-large justify-center no-underline rounded-full shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform duration-300"
                >
                  {t.modelsPage.openInPlayground}
                </Link>
                <button
                  onClick={() => {
                    copyToClipboard(model.id);
                    dispatch(
                      showNotification({
                        message: t.modelsPage.copiedModelId.replace(
                          "{name}",
                          model.model_name,
                        ),
                      }),
                    );
                  }}
                  className="btn-secondary btn-large justify-center rounded-full hover:border-primary/30 hover:text-primary transition-colors"
                >
                  <i className="fas fa-copy mr-2 opacity-70" />
                  {t.modelsPage.copyModelId}
                </button>
                {model.source_url ? (
                  <a
                    href={model.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary btn-large justify-center rounded-full no-underline hover:border-primary/30 hover:text-primary transition-colors"
                  >
                    <i className="fas fa-up-right-from-square mr-2 opacity-70" />
                    {t.modelsPage.viewSource}
                  </a>
                ) : null}
              </div>
            </div>

            <div className="editorial-panel space-y-4 sm:space-y-5 p-4 sm:p-5 md:p-7 shadow-2xl bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem]">
              <div className="border-b border-border pb-4">
                <div className="text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium">
                  {t.modelsPage.detailSnapshot}
                </div>
                <div className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-text-primary">
                  {t.modelsPage.detailSnapshotTitle}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-dark-light/25 p-4">
                  <div className="text-[0.62rem] uppercase tracking-[0.18em] text-text-secondary font-semibold">
                    {t.modelsPage.input}
                  </div>
                  <div className="mt-2 text-xl font-bold text-primary">
                    {formatPricePerMillion(model.input_price)}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-dark-light/25 p-4">
                  <div className="text-[0.62rem] uppercase tracking-[0.18em] text-text-secondary font-semibold">
                    {t.modelsPage.output}
                  </div>
                  <div className="mt-2 text-xl font-bold text-secondary">
                    {formatPricePerMillion(model.output_price)}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-dark-light/25 p-4">
                  <div className="text-[0.62rem] uppercase tracking-[0.18em] text-text-secondary font-semibold">
                    {t.modelsPage.context}
                  </div>
                  <div className="mt-2 text-xl font-bold text-text-primary">
                    {formatContextLength(
                      model.context_length,
                      t.modelsPage.unlabeled,
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-dark-light/25 p-4">
                  <div className="text-[0.62rem] uppercase tracking-[0.18em] text-text-secondary font-semibold">
                    {t.modelsPage.accessMethod}
                  </div>
                  <div className="mt-2 text-sm font-bold text-text-primary">
                    {t.modelsPage.openaiCompatible}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-4">
                <div className="text-[0.62rem] uppercase tracking-[0.18em] text-text-secondary font-semibold">
                  {t.modelsPage.modelIdLabel}
                </div>
                <div className="mt-2 break-all font-mono text-sm text-text-primary">
                  {model.id}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <article className="section-shell rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-4 sm:p-6 md:p-8 shadow-sm">
            <div className="text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium">
              {t.modelsPage.detailOverview}
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
              {t.modelsPage.detailOverviewTitle}
            </h2>
            <p className="mt-4 text-[0.9rem] sm:text-base leading-relaxed text-text-secondary">
              {description}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-dark-light/20 p-4">
                <div className="text-[0.62rem] uppercase tracking-[0.18em] text-text-secondary font-semibold">
                  {t.modelsPage.provider}
                </div>
                <div className="mt-2 text-lg font-bold text-text-primary">
                  {model.provider}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-dark-light/20 p-4">
                <div className="text-[0.62rem] uppercase tracking-[0.18em] text-text-secondary font-semibold">
                  {t.modelsPage.category}
                </div>
                <div className="mt-2 text-lg font-bold text-text-primary">
                  {categoryNames[model.category] || t.modelsPage.generic}
                </div>
              </div>
            </div>
          </article>

          <article className="section-shell rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-4 sm:p-6 md:p-8 shadow-sm">
            <div className="text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium">
              {t.modelsPage.detailIntegration}
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
              {t.modelsPage.detailIntegrationTitle}
            </h2>
            <div className="mt-4 space-y-3 text-[0.9rem] sm:text-base leading-relaxed text-text-secondary">
              <p>{t.modelsPage.detailIntegrationBody1}</p>
              <p>{t.modelsPage.detailIntegrationBody2}</p>
              <p>{t.modelsPage.detailIntegrationBody3}</p>
            </div>
          </article>
        </section>
      </main>
      <Footer />
    </div>
  );
}
