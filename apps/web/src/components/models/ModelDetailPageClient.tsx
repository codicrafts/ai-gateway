"use client";

import Link from "next/link";
import type { Model } from "@ai-gateway/shared-types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import { isModelPlaygroundAvailable } from "@/services/catalog/model-availability";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { copyToClipboard } from "@/utils/helpers";
import { formatPricePerMillion } from "@/utils/modelPricing";
import { showNotification } from "@/store/slices/notificationSlice";
import type { ModelDetailInsights } from "@/services/models/model-detail.service";
import {
  categoryStyles,
  formatContextLength,
  getLocalizedCapabilityTags,
  getLocalizedModelDescription,
} from "@/components/models/modelCatalog";

function benchmarkTone(score: number) {
  if (score >= 85) return "text-success bg-success/10 border-success/20";
  if (score >= 65) return "text-primary bg-primary/10 border-primary/20";
  if (score >= 45) return "text-warning bg-warning/10 border-warning/20";
  return "text-text-secondary bg-dark-light/20 border-border";
}

export default function ModelDetailPageClient({
  model,
  insights,
}: {
  model: Model;
  insights: ModelDetailInsights;
}) {
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
  const canOpenPlayground = isModelPlaygroundAvailable(model);
  const capabilityTags = getLocalizedCapabilityTags(
    model,
    locale,
    defaultCapabilityTags,
    t.modelsPage.genericAccess,
  );
  const benchmarkLabels = {
    reasoning: t.modelsPage.benchmarkReasoning,
    coding: t.modelsPage.benchmarkCoding,
    context: t.modelsPage.benchmarkContext,
    multimodal: t.modelsPage.benchmarkMultimodal,
  };
  const runtimeHealthTone =
    insights.runtime.health.status === "online"
      ? "text-success bg-success/10 border-success/20"
      : insights.runtime.health.status === "degraded"
        ? "text-warning bg-warning/10 border-warning/20"
        : insights.runtime.health.status === "offline"
          ? "text-danger bg-danger/10 border-danger/20"
          : "text-text-secondary bg-dark-light/20 border-border";
  const runtimeHealthLabel =
    insights.runtime.health.status === "online"
      ? t.modelsPage.runtimeOnline
      : insights.runtime.health.status === "degraded"
        ? t.modelsPage.runtimeDegraded
        : insights.runtime.health.status === "offline"
          ? t.modelsPage.runtimeOffline
          : t.modelsPage.runtimeUnknown;
  const checkedAtLabel = insights.runtime.health.checked_at
    ? new Date(insights.runtime.health.checked_at * 1000).toLocaleString(
        locale === "zh" ? "zh-CN" : "en-US",
      )
    : t.modelsPage.runtimeNoData;

  const fieldGuideItems = [
    { label: t.modelsPage.provider, value: model.provider },
    {
      label: t.modelsPage.category,
      value: categoryNames[model.category] || t.modelsPage.generic,
    },
    { label: t.modelsPage.accessMethod, value: t.modelsPage.openaiCompatible },
    { label: t.modelsPage.runtimeCheckedAt, value: checkedAtLabel },
  ];

  const snapshotStats = [
    {
      label: t.modelsPage.input,
      value: formatPricePerMillion(model.input_price),
      tone: "text-primary",
    },
    {
      label: t.modelsPage.output,
      value: formatPricePerMillion(model.output_price),
      tone: "text-secondary",
    },
    {
      label: t.modelsPage.context,
      value: formatContextLength(model.context_length, t.modelsPage.unlabeled),
      tone: "text-text-primary",
    },
    {
      label: t.modelsPage.detailRuntimeTitle,
      value: runtimeHealthLabel,
      tone:
        insights.runtime.health.status === "online"
          ? "text-success"
          : insights.runtime.health.status === "degraded"
            ? "text-warning"
            : insights.runtime.health.status === "offline"
              ? "text-danger"
              : "text-text-secondary",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-0 inset-x-0 h-[520px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />
      <div className="absolute inset-0 pointer-events-none -z-10 opacity-[0.18] [background-image:linear-gradient(rgba(184,87,43,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(184,87,43,0.08)_1px,transparent_1px)] [background-size:38px_38px]" />
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-8 md:py-12 lg:py-16">
        <section className="section-shell mb-4 sm:mb-6 md:mb-8 overflow-hidden rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,243,236,0.92))] px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 lg:px-7 lg:py-6 shadow-[0_24px_80px_rgba(58,35,18,0.08)]">
          <div className="mb-2.5 sm:mb-3 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[0.65rem] sm:text-[0.7rem] font-semibold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
            <Link
              href="/models"
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-border bg-white/80 px-2.5 py-1 sm:px-3 sm:py-1.5 no-underline transition-colors hover:border-primary/30 hover:text-primary text-xs sm:text-sm"
            >
              <i className="fas fa-arrow-left text-xs sm:text-sm" />
              {t.modelsPage.backToCatalog}
            </Link>
            <span>/</span>
            <span className="text-xs sm:text-sm">{model.model_name}</span>
          </div>

          <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.15fr)_340px] lg:gap-6">
            <div className="space-y-4 sm:space-y-5">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[0.6rem] sm:text-[0.62rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] ${categoryStyles[model.category] || categoryStyles.embedding}`}
                >
                  {categoryNames[model.category] || t.modelsPage.generic}
                </span>
                <span className="rounded-full border border-border bg-white/80 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[0.6rem] sm:text-[0.62rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                  {model.provider}
                </span>
                <span className="rounded-full border border-success/30 bg-success/15 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[0.6rem] sm:text-[0.62rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-success">
                  {t.modelsPage.catalogReady}
                </span>
              </div>

              <div className="max-w-4xl space-y-2 sm:space-y-2.5 md:space-y-3.5">
                <div className="text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.18em] sm:tracking-[0.2em] text-text-secondary font-semibold">
                  {t.modelsPage.detailOverview}
                </div>
                <h1 className="font-bold tracking-tight leading-[0.96] text-[1.75rem] sm:text-[2.35rem] md:text-[3rem] lg:text-[4.25rem] text-text-primary">
                  {model.model_name}
                </h1>
                <p className="max-w-3xl text-[0.85rem] sm:text-[0.95rem] md:text-base lg:text-[1.08rem] leading-relaxed text-text-secondary">
                  {description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-3">
                {capabilityTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-white/80 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[0.62rem] sm:text-[0.68rem] font-semibold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="grid gap-2 sm:gap-3 sm:grid-cols-[auto_auto] lg:grid-cols-[auto_auto_auto] sm:items-center sm:justify-start">
                {canOpenPlayground ? (
                  <Link
                    href={`/playground?model=${model.id}`}
                    className="btn-primary btn-large justify-center no-underline rounded-full shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform duration-300 text-xs sm:text-sm px-4 py-2 sm:px-5 sm:py-2.5"
                  >
                    {t.modelsPage.validateInPlayground}
                  </Link>
                ) : null}
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
                  className="btn-secondary btn-large justify-center rounded-full hover:border-primary/30 hover:text-primary transition-colors text-xs sm:text-sm px-4 py-2 sm:px-5 sm:py-2.5"
                >
                  <i className="fas fa-copy mr-1.5 sm:mr-2 opacity-70 text-xs sm:text-sm" />
                  {t.modelsPage.copyModelId}
                </button>
                {model.source_url ? (
                  <a
                    href={model.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary btn-large justify-center rounded-full no-underline hover:border-primary/30 hover:text-primary transition-colors text-xs sm:text-sm px-4 py-2 sm:px-5 sm:py-2.5"
                  >
                    <i className="fas fa-up-right-from-square mr-1.5 sm:mr-2 opacity-70 text-xs sm:text-sm" />
                    {t.modelsPage.viewSource}
                  </a>
                ) : null}
              </div>

              <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {fieldGuideItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-border/70 bg-white/80 px-3 py-3 sm:px-4 sm:py-4 shadow-sm"
                  >
                    <div className="text-[0.6rem] sm:text-[0.62rem] uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary font-semibold">
                      {item.label}
                    </div>
                    <div className="mt-1.5 sm:mt-2 text-sm sm:text-base font-bold text-text-primary break-words">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-border/70 bg-white/75 px-3 py-3 sm:px-4 sm:py-4 md:px-5">
                <div className="text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.18em] sm:tracking-[0.2em] text-text-secondary font-medium">
                  {t.modelsPage.selectionNotes}
                </div>
                <div className="mt-3 sm:mt-4 grid gap-3 sm:gap-4 md:grid-cols-3">
                  <p className="text-xs sm:text-sm leading-6 sm:leading-7 text-text-secondary">
                    {t.modelsPage.detailIntegrationBody1}
                  </p>
                  <p className="text-xs sm:text-sm leading-6 sm:leading-7 text-text-secondary">
                    {t.modelsPage.detailIntegrationBody2}
                  </p>
                  <p className="text-xs sm:text-sm leading-6 sm:leading-7 text-text-secondary">
                    {t.modelsPage.detailIntegrationBody3}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:pt-4">
              <div className="editorial-panel sticky top-24 space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 lg:p-6 shadow-2xl bg-white/96 backdrop-blur-xl rounded-xl sm:rounded-[1.125rem] md:rounded-[1.25rem]">
                <div className="text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.18em] sm:tracking-[0.2em] text-text-secondary font-medium">
                  {t.modelsPage.detailSnapshot}
                </div>
                <div className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-text-primary">
                  {t.modelsPage.detailSnapshotTitle}
                </div>

                <div className="grid gap-2.5 sm:gap-3 grid-cols-2">
                  {snapshotStats.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,241,233,0.9))] p-3 sm:p-4"
                    >
                      <div className="text-[0.6rem] sm:text-[0.62rem] uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary font-semibold">
                        {item.label}
                      </div>
                      <div className={`mt-1.5 sm:mt-2 break-all text-base sm:text-lg md:text-xl font-bold leading-tight tracking-tight ${item.tone}`}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-dashed border-primary/20 bg-primary/5 p-3 sm:p-4">
                  <div className="text-[0.6rem] sm:text-[0.62rem] uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary font-semibold">
                    {t.modelsPage.modelIdLabel}
                  </div>
                  <div className="mt-1.5 sm:mt-2 break-all font-mono text-xs sm:text-sm text-text-primary">
                    {model.id}
                  </div>
                </div>

                <div className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-border/70 bg-dark-light/5 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="text-[0.6rem] sm:text-[0.62rem] uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary font-semibold">
                      {t.modelsPage.runtimeBoundChannels}
                    </div>
                    <span
                      className={`inline-flex min-w-[4rem] sm:min-w-[4.75rem] items-center justify-center rounded-full border px-2 py-0.5 sm:px-2 sm:py-1 text-[0.56rem] sm:text-[0.58rem] font-bold uppercase tracking-[0.12em] sm:tracking-[0.14em] ${runtimeHealthTone}`}
                    >
                      {runtimeHealthLabel}
                    </span>
                  </div>
                  <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
                    {[
                      {
                        label: t.modelsPage.runtimeOnlineChannels,
                        value: insights.runtime.health.online_channels,
                      },
                      {
                        label: t.modelsPage.runtimeDegradedChannels,
                        value: insights.runtime.health.degraded_channels,
                      },
                      {
                        label: t.modelsPage.runtimeOfflineChannels,
                        value: insights.runtime.health.offline_channels,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg sm:rounded-xl bg-white/90 px-2 py-2 sm:px-3 sm:py-3 text-center"
                      >
                        <div className="text-[0.56rem] sm:text-[0.58rem] uppercase tracking-[0.12em] sm:tracking-[0.14em] text-text-secondary font-semibold">
                          {item.label}
                        </div>
                        <div className="mt-0.5 sm:mt-1 text-sm sm:text-base font-bold text-text-primary">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:gap-4 md:gap-5 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <article className="section-shell rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-4 sm:p-5 md:p-6 lg:p-8 shadow-sm">
            <div className="text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.18em] sm:tracking-[0.2em] text-text-secondary font-medium">
              {t.modelsPage.detailBenchmark}
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-text-primary">
                  {t.modelsPage.detailBenchmarkTitle}
                </h2>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-text-secondary">
                  {t.modelsPage.detailBenchmarkBody}
                </p>
              </div>
              <span className="rounded-full border border-border bg-dark-light/15 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[0.6rem] sm:text-[0.62rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary self-start sm:self-auto">
                {t.modelsPage.detailBenchmarkReference}
              </span>
            </div>
            <div className="mt-4 sm:mt-5 md:mt-6 space-y-2.5 sm:space-y-3">
              {insights.benchmark.metrics.map((metric) => (
                <div
                  key={metric.key}
                  className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-border bg-dark-light/10 p-3 sm:p-4"
                >
                  <div className="flex items-center justify-between gap-3 sm:gap-4">
                    <div className="text-[0.65rem] sm:text-[0.72rem] uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary font-semibold">
                      {benchmarkLabels[metric.key]}
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1 text-[0.6rem] sm:text-[0.62rem] font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] ${benchmarkTone(metric.score)}`}
                    >
                      {metric.score}
                    </span>
                  </div>
                  <div className="mt-3 sm:mt-4 h-2 sm:h-2.5 rounded-full bg-dark-light/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary via-[#d28a62] to-secondary"
                      style={{ width: `${metric.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="section-shell rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-4 sm:p-5 md:p-6 lg:p-8 shadow-sm">
            <div className="text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.18em] sm:tracking-[0.2em] text-text-secondary font-medium">
              {t.modelsPage.detailRuntime}
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:gap-2.5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-text-primary">
                  {t.modelsPage.detailRuntimeTitle}
                </h2>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-text-secondary">
                  {t.modelsPage.detailRuntimeBody}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 sm:gap-1.5 self-start rounded-full border px-2.5 py-1 sm:px-3 sm:py-1.5 text-[0.6rem] sm:text-[0.62rem] font-bold uppercase tracking-[0.12em] sm:tracking-[0.14em] ${runtimeHealthTone}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                {runtimeHealthLabel}
              </span>
            </div>

            <div className="mt-4 sm:mt-5 md:mt-6 grid gap-2.5 sm:gap-3 grid-cols-2 xl:grid-cols-4">
              {[
                { label: t.modelsPage.latencyBest, value: insights.runtime.latency.best_ms },
                {
                  label: t.modelsPage.latencyMedian,
                  value: insights.runtime.latency.median_ms,
                },
                { label: t.modelsPage.latencyP95, value: insights.runtime.latency.p95_ms },
                {
                  label: t.modelsPage.latencyWorst,
                  value: insights.runtime.latency.worst_ms,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-border bg-dark-light/10 p-3 sm:p-4"
                >
                  <div className="text-[0.6rem] sm:text-[0.62rem] uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary font-semibold">
                    {item.label}
                  </div>
                  <div className="mt-1.5 sm:mt-2 text-base sm:text-lg font-bold text-text-primary">
                    {typeof item.value === "number"
                      ? `${item.value} ms`
                      : t.modelsPage.runtimeNoData}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 sm:mt-5 md:mt-6 rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-border bg-[linear-gradient(180deg,rgba(248,244,237,0.78),rgba(255,255,255,0.94))] p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="text-[0.62rem] sm:text-[0.68rem] uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary font-semibold">
                  {t.modelsPage.runtimeBoundChannels}
                </div>
                <div className="text-[0.65rem] sm:text-xs text-text-secondary">
                  {insights.runtime.health.total_channels}{" "}
                  {t.modelsPage.runtimeChannelUnit}
                </div>
              </div>
              {insights.runtime.channels.length === 0 ? (
                <div className="mt-3 sm:mt-4 rounded-lg sm:rounded-xl border border-dashed border-border bg-white/80 px-3 py-4 sm:px-4 sm:py-6 text-xs sm:text-sm text-text-secondary">
                  {t.modelsPage.runtimeNoChannelData}
                </div>
              ) : (
                <div className="mt-3 sm:mt-4 space-y-2.5 sm:space-y-3">
                  {insights.runtime.channels.map((channel) => (
                    <div
                      key={`${channel.id}-${channel.name}`}
                      className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-border bg-white/95 px-3 py-2.5 sm:px-4 sm:py-3"
                    >
                      <div className="grid gap-2 sm:gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-text-primary">
                            {channel.name}
                          </div>
                          <div className="mt-0.5 sm:mt-1 text-[0.65rem] sm:text-xs text-text-secondary">
                            {t.modelsPage.runtimeGroupLabel}: {channel.group} · ID #
                            {channel.id}
                          </div>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1 text-[0.6rem] sm:text-[0.62rem] font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] ${
                            channel.status === "online"
                              ? "text-success bg-success/10 border-success/20"
                              : channel.status === "degraded"
                                ? "text-warning bg-warning/10 border-warning/20"
                                : "text-danger bg-danger/10 border-danger/20"
                          }`}
                        >
                          {channel.status === "online"
                            ? t.modelsPage.runtimeOnline
                            : channel.status === "degraded"
                              ? t.modelsPage.runtimeDegraded
                              : t.modelsPage.runtimeOffline}
                        </span>
                        <span className="rounded-full border border-border bg-dark-light/10 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[0.6rem] sm:text-[0.62rem] font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary">
                          {typeof channel.response_time_ms === "number"
                            ? `${channel.response_time_ms} ms`
                            : t.modelsPage.runtimeNoData}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        </section>
      </main>
      <Footer />
    </div>
  );
}
