import type { Model } from '@ai-gateway/shared-types';
import type { AuthAudience } from '@/lib/auth-region';
import {
  PRICING_FAQS,
  PRICING_PLANS,
  PRICING_RAILS,
  PRICING_RULES,
  type PricingFaqReference,
  type PricingPlanReference,
  type PricingRailReference,
  type PricingRuleReference,
} from '@/config/pricing-reference';

export type PricingExampleReference = {
  key: string;
  titleZh: string;
  titleEn: string;
  value: string;
  bodyZh: string;
  bodyEn: string;
};

export type PricingReference = {
  rails: PricingRailReference[];
  rules: PricingRuleReference[];
  faqs: PricingFaqReference[];
  plans: PricingPlanReference[];
  examples: PricingExampleReference[];
};

function getPricingRailsForAudience(audience: AuthAudience) {
  return PRICING_RAILS.filter((rail) =>
    audience === 'domestic' ? rail.key === 'domestic' : rail.key === 'international',
  );
}

function formatPrice(price: number) {
  if (!Number.isFinite(price) || price <= 0) return '$0';
  if (price >= 1) return `$${price.toFixed(2).replace(/\.00$/, '')}`;
  return `$${price.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}`;
}

export function getPricingReference(pricingModels: Model[], audience: AuthAudience = 'global'): PricingReference {
  const cheapestInputModel = [...pricingModels].sort(
    (a, b) => a.input_price - b.input_price,
  )[0];
  const averageOutputPrice =
    pricingModels.length > 0
      ? pricingModels.reduce((sum, model) => sum + model.output_price, 0) /
        pricingModels.length
      : 0;
  const longestContextModel = [...pricingModels].sort(
    (a, b) => b.context_length - a.context_length,
  )[0];

  return {
    rails: getPricingRailsForAudience(audience),
    rules: PRICING_RULES,
    faqs: PRICING_FAQS,
    plans: PRICING_PLANS,
    examples: [
      {
        key: 'cheapest-input',
        titleZh: '最低输入价参考',
        titleEn: 'Lowest input reference',
        value: cheapestInputModel
          ? `${formatPrice(cheapestInputModel.input_price)}/1M`
          : '$0/1M',
        bodyZh: cheapestInputModel
          ? `当前公开目录里输入成本最低的文本候选是 ${cheapestInputModel.model_name}。`
          : '当前还没有可用的价格样本。',
        bodyEn: cheapestInputModel
          ? `The current lowest-input public text candidate is ${cheapestInputModel.model_name}.`
          : 'No pricing sample is available yet.',
      },
      {
        key: 'average-output',
        titleZh: '平均输出价参考',
        titleEn: 'Average output reference',
        value: `${formatPrice(averageOutputPrice)}/1M`,
        bodyZh: '用来帮助你快速判断常见文本模型在输出成本上的大致密度。',
        bodyEn: 'Useful for quickly judging the rough output-cost density of common text models.',
      },
      {
        key: 'longest-context',
        titleZh: '长上下文候选',
        titleEn: 'Longest-context candidate',
        value: longestContextModel
          ? `${Math.round(longestContextModel.context_length / 1000)}K`
          : '0K',
        bodyZh: longestContextModel
          ? `${longestContextModel.model_name} 当前提供最长的公开上下文参考。`
          : '当前还没有上下文长度样本。',
        bodyEn: longestContextModel
          ? `${longestContextModel.model_name} currently provides the longest public context reference.`
          : 'No context-length sample is available yet.',
      },
    ],
  };
}
