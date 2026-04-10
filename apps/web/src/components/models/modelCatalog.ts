import type { Model } from "@ai-gateway/shared-types";

export const categoryStyles: Record<string, string> = {
  text: "bg-[rgba(169,75,43,0.14)] text-primary",
  image: "bg-[rgba(33,93,89,0.14)] text-secondary",
  audio: "bg-[rgba(186,122,42,0.14)] text-warning",
  video: "bg-[rgba(45,127,84,0.14)] text-success",
  embedding: "bg-[rgba(24,19,16,0.08)] text-text-primary",
};

export function getLocalizedModelDescription(model: Model, locale: string) {
  if (locale === "zh" && model.description_zh) return model.description_zh;
  if (locale === "en" && model.description_en) return model.description_en;
  return model.description;
}

export function getLocalizedCapabilityTags(
  model: Model,
  locale: string,
  defaultCapabilityTags: Record<string, string[]>,
  genericAccessTag: string,
) {
  if (locale === "zh" && model.capabilities_zh?.length) {
    return model.capabilities_zh;
  }
  if (locale === "en" && model.capabilities_en?.length) {
    return model.capabilities_en;
  }
  return defaultCapabilityTags[model.category] || [genericAccessTag];
}

export function formatContextLength(contextLength: number, fallback: string) {
  if (!Number.isFinite(contextLength) || contextLength <= 0) {
    return fallback;
  }

  if (contextLength >= 1000) {
    const inThousands = contextLength / 1000;
    const formatted =
      Number.isInteger(inThousands) || inThousands >= 100
        ? Math.round(inThousands).toString()
        : inThousands.toFixed(1).replace(/\.0$/, "");
    return `${formatted}K`;
  }

  return contextLength.toLocaleString();
}

export type ModelCapabilitySignal =
  | "reasoning"
  | "code"
  | "long_context"
  | "multimodal"
  | "image_generation"
  | "embedding"
  | "low_latency"
  | "affordable";

export function getModelCapabilitySignals(model: Model): ModelCapabilitySignal[] {
  const haystack = [
    model.model_name,
    model.provider,
    model.description,
    model.description_en,
    model.description_zh,
    ...(model.capabilities_en || []),
    ...(model.capabilities_zh || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const signals = new Set<ModelCapabilitySignal>();

  if (
    haystack.includes("reason") ||
    haystack.includes("推理") ||
    haystack.includes("analysis") ||
    haystack.includes("分析")
  ) {
    signals.add("reasoning");
  }

  if (
    haystack.includes("code") ||
    haystack.includes("coder") ||
    haystack.includes("代码") ||
    haystack.includes("工程")
  ) {
    signals.add("code");
  }

  if (
    model.context_length >= 100_000 ||
    haystack.includes("long context") ||
    haystack.includes("长上下文")
  ) {
    signals.add("long_context");
  }

  if (
    model.category === "image" ||
    model.category === "audio" ||
    model.category === "video" ||
    haystack.includes("multimodal") ||
    haystack.includes("多模态")
  ) {
    signals.add("multimodal");
  }

  if (
    model.category === "image" ||
    haystack.includes("image generation") ||
    haystack.includes("图像生成") ||
    haystack.includes("creative") ||
    haystack.includes("创意")
  ) {
    signals.add("image_generation");
  }

  if (
    model.category === "embedding" ||
    haystack.includes("embedding") ||
    haystack.includes("retrieval") ||
    haystack.includes("嵌入") ||
    haystack.includes("检索")
  ) {
    signals.add("embedding");
  }

  if (
    haystack.includes("fast") ||
    haystack.includes("low latency") ||
    haystack.includes("lightweight") ||
    haystack.includes("快速") ||
    haystack.includes("低延迟") ||
    haystack.includes("轻量")
  ) {
    signals.add("low_latency");
  }

  if (
    (Number.isFinite(model.input_price) && model.input_price > 0 && model.input_price <= 1) ||
    haystack.includes("affordable") ||
    haystack.includes("经济")
  ) {
    signals.add("affordable");
  }

  return Array.from(signals);
}
