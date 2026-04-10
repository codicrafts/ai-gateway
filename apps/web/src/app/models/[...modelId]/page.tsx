import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Model } from "@ai-gateway/shared-types";
import ModelDetailPageClient from "@/components/models/ModelDetailPageClient";
import { buildPageMetadata } from "@/config/site";
import { listModelCatalog } from "@/services/catalog/model-catalog.service";

function normalizeModelId(modelId: string[] | string) {
  return Array.isArray(modelId) ? modelId.join("/") : modelId;
}

async function findModelById(modelId: string): Promise<Model | null> {
  const models = await listModelCatalog({ limit: 300 });
  return models.find((model) => model.id === modelId) || null;
}

export async function generateMetadata({
  params,
}: {
  params: { modelId: string[] };
}): Promise<Metadata> {
  const modelId = normalizeModelId(params.modelId);
  const model = await findModelById(modelId);

  if (!model) {
    return buildPageMetadata({
      title: "Model Detail",
      description: "Model detail is not available for the requested model.",
      path: `/models/${modelId}`,
    });
  }

  return buildPageMetadata({
    title: `${model.model_name} | Model Detail`,
    description: model.description_en || model.description || model.model_name,
    path: `/models/${model.id}`,
  });
}

export default async function ModelDetailPage({
  params,
}: {
  params: { modelId: string[] };
}) {
  const modelId = normalizeModelId(params.modelId);
  const model = await findModelById(modelId);

  if (!model) {
    notFound();
  }

  return <ModelDetailPageClient model={model} />;
}
