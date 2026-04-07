"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Model } from "@ai-gateway/shared-types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EditorialSelect, {
  EditorialSelectOption,
} from "@/components/ui/EditorialSelect";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  hydrateModels,
  setCategoryFilter,
  setProviderFilter,
  setSearchTerm,
  setSortFilter,
} from "@/store/slices/modelsSlice";
import { showNotification } from "@/store/slices/notificationSlice";
import { copyToClipboard } from "@/utils/helpers";
import { formatPricePerMillion } from "@/utils/modelPricing";
import { useTranslation } from "@/hooks/useTranslation";

const categoryStyles: Record<string, string> = {
  text: "bg-[rgba(169,75,43,0.14)] text-primary",
  image: "bg-[rgba(33,93,89,0.14)] text-secondary",
  audio: "bg-[rgba(186,122,42,0.14)] text-warning",
  video: "bg-[rgba(45,127,84,0.14)] text-success",
  embedding: "bg-[rgba(24,19,16,0.08)] text-text-primary",
};

function getLocalizedModelDescription(model: Model, locale: string) {
  if (locale === "zh" && model.description_zh) return model.description_zh;
  if (locale === "en" && model.description_en) return model.description_en;
  return model.description;
}

function getLocalizedCapabilityTags(
  model: Model,
  locale: string,
  defaultCapabilityTags: Record<string, string[]>,
  genericAccessTag: string,
) {
  if (locale === "zh" && model.capabilities_zh?.length)
    return model.capabilities_zh;
  if (locale === "en" && model.capabilities_en?.length)
    return model.capabilities_en;
  return defaultCapabilityTags[model.category] || [genericAccessTag];
}

export default function ModelsPageClient({
  initialModels,
}: {
  initialModels: Model[];
}) {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.locale.locale);
  const t = useTranslation();
  const categoryNames = useMemo<Record<string, string>>(
    () => ({
      text: t.modelsPage.categoryText,
      image: t.modelsPage.categoryImage,
      audio: t.modelsPage.categoryAudio,
      video: t.modelsPage.categoryVideo,
      embedding: t.modelsPage.categoryEmbedding,
    }),
    [t],
  );
  const { models, searchTerm, providerFilter, categoryFilter, sortFilter } =
    useAppSelector((s) => s.models);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    dispatch(hydrateModels(initialModels));
  }, [dispatch, initialModels]);

  const defaultCapabilityTags = useMemo<Record<string, string[]>>(
    () => ({
      text: [t.modelsPage.tagGeneral, t.modelsPage.tagChat],
      image: [t.modelsPage.tagImageGeneration, t.modelsPage.tagCreative],
      audio: [t.modelsPage.tagGeneral],
      video: [t.modelsPage.tagGeneral],
      embedding: [t.modelsPage.tagEmbedding, t.modelsPage.tagRetrieval],
    }),
    [t],
  );

  const filtered = useMemo(() => {
    const result = [...(models || [])].filter((model) => {
      const term = searchTerm.trim().toLowerCase();
      const localizedDescription = getLocalizedModelDescription(
        model,
        locale,
      ).toLowerCase();
      const matchSearch =
        !term ||
        model.model_name.toLowerCase().includes(term) ||
        localizedDescription.includes(term) ||
        model.id.toLowerCase().includes(term);
      const matchProvider =
        !providerFilter || model.provider === providerFilter;
      const matchCategory =
        !categoryFilter || model.category === categoryFilter;
      return matchSearch && matchProvider && matchCategory;
    });

    switch (sortFilter) {
      case "price-low":
        result.sort((a, b) => a.input_price - b.input_price);
        break;
      case "price-high":
        result.sort((a, b) => b.input_price - a.input_price);
        break;
      case "context":
        result.sort((a, b) => b.context_length - a.context_length);
        break;
      default:
        result.sort((a, b) => a.model_name.localeCompare(b.model_name));
        break;
    }

    return result;
  }, [models, searchTerm, providerFilter, categoryFilter, sortFilter, locale]);

  const providers = Array.from(
    new Set((models || []).map((model) => model.provider)),
  );
  const providerOptions = useMemo<EditorialSelectOption[]>(
    () => [
      { value: "", label: t.modelsPage.allProviders },
      ...providers.map((provider) => ({ value: provider, label: provider })),
    ],
    [providers, t],
  );
  const categoryOptions = useMemo<EditorialSelectOption[]>(
    () => [
      { value: "", label: t.modelsPage.allCategories },
      ...Object.entries(categoryNames).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    [categoryNames, t],
  );
  const sortOptions = useMemo<EditorialSelectOption[]>(
    () => [
      { value: "name", label: t.modelsPage.sortName },
      { value: "price-low", label: t.modelsPage.sortPriceLow },
      { value: "price-high", label: t.modelsPage.sortPriceHigh },
      { value: "context", label: t.modelsPage.sortContext },
    ],
    [t],
  );
  const cheapestModel = useMemo(
    () => [...filtered].sort((a, b) => a.input_price - b.input_price)[0],
    [filtered],
  );
  const longestContextModel = useMemo(
    () => [...filtered].sort((a, b) => b.context_length - a.context_length)[0],
    [filtered],
  );

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-0 inset-x-0 h-[500px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60"></div>
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <section className="section-shell mb-12 sm:mb-20">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1.2fr)_380px] xl:items-center">
            <div className="space-y-6">
              <span className="eyebrow inline-flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                <span className="text-primary font-medium tracking-wider">{t.modelsPage.eyebrow}</span>
              </span>
              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-bold tracking-tight leading-[1.1] sm:text-5xl lg:text-6xl text-text-primary">
                  {t.modelsPage.title}
                </h1>
                <p className="max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl">
                  {t.modelsPage.subtitle}
                </p>
              </div>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link href="/playground" className="btn-primary btn-large no-underline shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform duration-300">
                  {t.modelsPage.openPlayground}
                </Link>
                <Link href="/pricing" className="btn-secondary btn-large no-underline hover:-translate-y-0.5 transition-transform duration-300 bg-white/50 backdrop-blur-sm">
                  {t.modelsPage.viewPricing}
                </Link>
              </div>
            </div>

            <div className="editorial-panel space-y-5 p-6 sm:p-8 shadow-2xl bg-white/95 backdrop-blur-xl rounded-[2rem]">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-xs uppercase tracking-[0.24em] text-text-secondary font-medium">{t.modelsPage.index}</span>
                <span className="rounded-full bg-success/20 border border-success/30 px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-success font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                  {t.modelsPage.liveCatalog}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border/80 bg-dark-light/30 p-5 hover:bg-white hover:shadow-md transition-all duration-300">
                  <div className="text-[0.68rem] uppercase tracking-[0.18em] text-text-secondary font-semibold">
                    {t.modelsPage.visibleModels}
                  </div>
                  <div className="mt-2 text-3xl font-bold text-text-primary tracking-tight">
                    {filtered.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-dark-light/30 p-5 hover:bg-white hover:shadow-md transition-all duration-300">
                  <div className="text-[0.68rem] uppercase tracking-[0.18em] text-text-secondary font-semibold">
                    {t.modelsPage.providerCount}
                  </div>
                  <div className="mt-2 text-3xl font-bold text-text-primary tracking-tight">
                    {providers.length}
                  </div>
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-5">
                <div className="text-[0.68rem] uppercase tracking-[0.18em] text-text-secondary font-semibold">
                  {t.modelsPage.catalogNotes}
                </div>
                <div className="text-sm leading-relaxed text-text-primary">
                  {cheapestModel
                    ? `${t.modelsPage.lowestPricePrefix} ${cheapestModel.model_name}。`
                    : t.modelsPage.loadingPrice}
                </div>
                <div className="text-sm leading-relaxed text-text-primary">
                  {longestContextModel
                    ? `${t.modelsPage.longestContextPrefix} ${longestContextModel.model_name}。`
                    : t.modelsPage.loadingContext}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-dark-light/30 p-5">
                <div className="text-[0.68rem] uppercase tracking-[0.18em] text-text-secondary font-semibold">
                  {t.modelsPage.catalogScope}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text-primary">
                  {t.modelsPage.catalogScopeBody1}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  {t.modelsPage.catalogScopeBody2}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell relative z-20 mb-8 overflow-visible sm:mb-12 bg-white/60 p-6 rounded-[2rem] border border-border shadow-sm backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-text-secondary font-medium">{t.modelsPage.queryDesk}</div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
                {t.modelsPage.filterTitle}
              </h2>
            </div>
            <button
              onClick={() => setShowFilters((value) => !value)}
              className="btn-secondary px-4 py-2 text-sm sm:hidden rounded-full shadow-sm"
            >
              <i className={`fas ${showFilters ? 'fa-times' : 'fa-sliders-h'} mr-2`} />
              {showFilters
                ? t.modelsPage.toggleFiltersHide
                : t.modelsPage.toggleFiltersShow}
            </button>
          </div>

          <div className={`grid gap-5 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] ${showFilters ? "grid" : "hidden sm:grid"}`}>
            <div className="lg:col-span-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t.modelsPage.search}
              </label>
              <div className="relative">
                <i className="fas fa-search pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  className="form-control pl-11 rounded-xl bg-white shadow-inner"
                  placeholder={t.modelsPage.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => dispatch(setSearchTerm(e.target.value))}
                />
              </div>
            </div>

            <div>
              <EditorialSelect
                label={t.modelsPage.provider}
                value={providerFilter}
                options={providerOptions}
                onChange={(nextValue) => dispatch(setProviderFilter(nextValue))}
              />
            </div>

            <div>
              <EditorialSelect
                label={t.modelsPage.category}
                value={categoryFilter}
                options={categoryOptions}
                onChange={(nextValue) => dispatch(setCategoryFilter(nextValue))}
              />
            </div>

            <div>
              <EditorialSelect
                label={t.modelsPage.sort}
                value={sortFilter}
                options={sortOptions}
                onChange={(nextValue) => dispatch(setSortFilter(nextValue))}
              />
            </div>
          </div>
        </section>

        <section className="relative z-0 mb-12 grid gap-6 md:grid-cols-3">
          <div className="editorial-panel rounded-[2rem] p-6 sm:p-8 bg-white border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-secondary">
              {t.modelsPage.averageInputPrice}
            </div>
            <div className="mt-4 text-4xl font-bold tracking-tight text-text-primary">
              $
              {filtered.length
                ? (
                    filtered.reduce(
                      (sum, model) => sum + model.input_price,
                      0,
                    ) / filtered.length
                  ).toFixed(2)
                : "0.00"}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {t.modelsPage.averageInputPriceDesc}
            </p>
          </div>
          <div className="editorial-panel rounded-[2rem] p-6 sm:p-8 bg-white border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-secondary">
              {t.modelsPage.maxContext}
            </div>
            <div className="mt-4 text-4xl font-bold tracking-tight text-text-primary">
              {longestContextModel
                ? `${Math.round(longestContextModel.context_length / 1000)}K`
                : "0K"}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {t.modelsPage.maxContextDesc}
            </p>
          </div>
          <div className="editorial-panel rounded-[2rem] p-6 sm:p-8 bg-white border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-secondary">
              {t.modelsPage.quickestStart}
            </div>
            <div className="mt-4 text-sm leading-relaxed text-text-primary font-medium">
              {t.modelsPage.quickestStartDesc}
            </div>
          </div>
        </section>

        <section className="relative z-0 mb-12 grid gap-6 md:grid-cols-3">
          {[
            {
              title: t.modelsPage.decisionCard1Title,
              desc: t.modelsPage.decisionCard1Desc,
            },
            {
              title: t.modelsPage.decisionCard2Title,
              desc: t.modelsPage.decisionCard2Desc,
            },
            {
              title: t.modelsPage.decisionCard3Title,
              desc: t.modelsPage.decisionCard3Desc,
            },
          ].map((item, index) => (
            <div
              key={item.title}
              className={`rounded-[2rem] border p-6 sm:p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${index === 2 ? "bg-primary/5 border-primary/20" : "bg-white border-border"}`}
            >
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-text-secondary mb-3 inline-block bg-dark-light/50 px-2 py-1 rounded">
                {String(index + 1).padStart(2, "0")}
              </div>
              <h3 className="text-xl font-bold text-text-primary tracking-tight">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {item.desc}
              </p>
            </div>
          ))}
        </section>

        {filtered.length === 0 ? (
          <section className="section-shell py-24 text-center bg-white rounded-[2rem] border border-border">
            <div className="mx-auto max-w-xl">
              <i className="fas fa-search text-4xl text-text-secondary/30 mb-6" />
              <div className="text-3xl font-bold tracking-tight text-text-primary">
                {t.modelsPage.noMatches}
              </div>
              <p className="mt-4 text-lg leading-relaxed text-text-secondary">
                {t.modelsPage.noMatchesDesc}
              </p>
            </div>
          </section>
        ) : (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((model, index) => (
              <article
                key={model.id}
                className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-border bg-white p-6 sm:p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20"
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] ${categoryStyles[model.category] || categoryStyles.embedding}`}
                      >
                        {categoryNames[model.category] || t.modelsPage.generic}
                      </span>
                      <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-text-primary">
                      {model.model_name}
                    </h3>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary">
                      {model.provider}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-dark-light/30 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.24em] text-text-secondary group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                    #{String(index + 1).padStart(2, "0")}
                  </div>
                </div>

                <p
                  className="min-h-[84px] text-sm leading-relaxed text-text-secondary"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {getLocalizedModelDescription(model, locale)}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {getLocalizedCapabilityTags(
                    model,
                    locale,
                    defaultCapabilityTags,
                    t.modelsPage.genericAccess,
                  )
                    .slice(0, 4)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-border/60 bg-dark-light/20 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-secondary group-hover:bg-white transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4 border-y border-border/60 py-5">
                  <div className="rounded-xl bg-dark-light/20 p-3 group-hover:bg-white border border-transparent group-hover:border-border/60 transition-colors">
                    <div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                      {t.modelsPage.input}
                    </div>
                    <div className="mt-1 text-lg font-bold text-primary break-words">
                      {formatPricePerMillion(model.input_price)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-dark-light/20 p-3 group-hover:bg-white border border-transparent group-hover:border-border/60 transition-colors">
                    <div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                      {t.modelsPage.output}
                    </div>
                    <div className="mt-1 text-lg font-bold text-secondary break-words">
                      {formatPricePerMillion(model.output_price)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-dark-light/20 p-3 group-hover:bg-white border border-transparent group-hover:border-border/60 transition-colors">
                    <div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                      {t.modelsPage.context}
                    </div>
                    <div className="mt-1 text-sm font-bold text-text-primary">
                      {model.context_length
                        ? `${Math.round(model.context_length / 1000)}K`
                        : t.modelsPage.unlabeled}
                    </div>
                  </div>
                  <div className="rounded-xl bg-dark-light/20 p-3 group-hover:bg-white border border-transparent group-hover:border-border/60 transition-colors">
                    <div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                      {t.modelsPage.accessMethod}
                    </div>
                    <div className="mt-1 text-sm font-bold text-text-primary line-clamp-1">
                      {t.modelsPage.openaiCompatible}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex gap-3 pt-6">
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
                    className="btn-secondary flex-1 justify-center rounded-full hover:border-primary/30 hover:text-primary transition-colors"
                  >
                    <i className="fas fa-copy mr-2 opacity-70" />
                    {t.modelsPage.copyId}
                  </button>
                  <Link
                    href={`/playground?model=${model.id}`}
                    className="btn-primary flex-1 justify-center no-underline rounded-full shadow-sm hover:shadow hover:-translate-y-0.5 transition-all"
                  >
                    {t.modelsPage.startTrial}
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}

        <section className="section-shell mt-16 sm:mt-24 p-8 sm:p-12 bg-white rounded-[2.5rem] border border-border shadow-sm">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
            <div>
              <span className="eyebrow inline-block bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full mb-4">{t.modelsPage.selectionNotes}</span>
              <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl mt-2">
                {t.modelsPage.selectionTitle}
              </h2>
            </div>
            <div className="space-y-5 text-sm sm:text-base leading-relaxed text-text-secondary">
              <p>{t.modelsPage.selectionBody1}</p>
              <p>{t.modelsPage.selectionBody2}</p>
              <p>{t.modelsPage.selectionBody3}</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
