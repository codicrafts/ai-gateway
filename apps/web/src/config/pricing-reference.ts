export type LocalizedCopy = {
  zh: string;
  en: string;
};

export type PricingRailReference = {
  key: string;
  label: LocalizedCopy;
  value: LocalizedCopy;
};

export type PricingRuleReference = {
  key: string;
  title: LocalizedCopy;
  body: LocalizedCopy;
};

export type PricingFaqReference = {
  key: string;
  question: LocalizedCopy;
  answer: LocalizedCopy;
};

export type PricingPlanReference = {
  key: string;
  name: LocalizedCopy;
  desc: LocalizedCopy;
  price: LocalizedCopy;
  unit: LocalizedCopy;
  cta: LocalizedCopy;
  href: string;
  featured?: boolean;
  badge?: LocalizedCopy;
  tone?: 'default' | 'featured' | 'support';
  features: LocalizedCopy[];
};

export const PRICING_RAILS: PricingRailReference[] = [
  {
    key: 'domestic',
    label: { zh: '国内支付', en: 'Domestic Payments' },
    value: { zh: '支付宝 / 微信支付', en: 'Alipay / WeChat Pay' },
  },
  {
    key: 'international',
    label: { zh: '国际支付', en: 'International Payments' },
    value: { zh: '信用卡 / PayPal', en: 'Credit Card / PayPal' },
  },
];

export const PRICING_RULES: PricingRuleReference[] = [
  {
    key: 'reference',
    title: { zh: '价格是参考，不是承诺报价', en: 'Pricing is reference, not a quoted contract' },
    body: {
      zh: '官网价格页用于选型、预算预估和接入判断。真实结算仍以组织账本、用量流水和企业采购方案为准。',
      en: 'The public pricing page is for selection, budgeting, and integration planning. Final settlement still follows the organization ledger, usage records, and enterprise procurement terms.',
    },
  },
  {
    key: 'ledger',
    title: { zh: '组织账本是实际结算口径', en: 'Organization ledger is the billing source of truth' },
    body: {
      zh: '团队自己的 API Key、用量和账单在组织侧落账，再同步运行时执行层。控制台里的余额、月消耗和订单记录以组织账本为准。',
      en: 'Team API keys, usage, and billing are recorded on the organization side first and then projected into the runtime layer. Balance, monthly spend, and order history in the console follow the organization ledger.',
    },
  },
  {
    key: 'enterprise',
    title: { zh: '企业方案卖的是边界和交付', en: 'Enterprise plans sell boundaries and delivery, not just discounts' },
    body: {
      zh: '企业采购重点不是拿到更低单价，而是统一协议、权限边界、路由策略、充值对账、支持方式和履约能力。',
      en: 'Enterprise procurement is not only about lower unit price. The stronger value is unified protocol, permission boundaries, routing, recharge and reconciliation, support terms, and delivery capability.',
    },
  },
];

export const PRICING_FAQS: PricingFaqReference[] = [
  {
    key: 'billing',
    question: { zh: '如何计费？', en: 'How is billing calculated?' },
    answer: {
      zh: '按实际 token 使用量计费。官网价格主要承担透明展示和预算预估作用，真实结算以组织账本和订单记录为准。',
      en: 'Billing is based on actual token usage. Public pricing mainly provides transparent reference and budgeting context, while final settlement follows the organization ledger and order history.',
    },
  },
  {
    key: 'payment',
    question: { zh: '支持哪些支付方式？', en: 'Which payment methods are supported?' },
    answer: {
      zh: '当前支持支付宝、微信支付、信用卡和 PayPal。企业采购可以继续走对公付款和账务协同。',
      en: 'Current payment rails include Alipay, WeChat Pay, credit card, and PayPal. Enterprise procurement can continue through invoicing and finance coordination.',
    },
  },
  {
    key: 'trial',
    question: { zh: '可以先试用再充值吗？', en: 'Can I validate before recharging?' },
    answer: {
      zh: '可以。先在模型目录和试验台完成验证，再决定是否给团队开放、充值或采购企业方案。',
      en: 'Yes. Validate in the catalog and Playground first, then decide whether to expose it to a team, recharge, or move into enterprise procurement.',
    },
  },
  {
    key: 'enterprise',
    question: { zh: '企业方案覆盖什么？', en: 'What does the enterprise plan cover?' },
    answer: {
      zh: '企业方案覆盖团队权限、额度策略、账单对账、运营支持、SLA 以及更稳定的交付边界。',
      en: 'Enterprise plans cover team permissions, quota strategy, billing and reconciliation, operational support, SLA, and stronger delivery boundaries.',
    },
  },
];

export const PRICING_PLANS: PricingPlanReference[] = [
  {
    key: 'starter',
    name: { zh: '起步版', en: 'Starter' },
    desc: {
      zh: '给个人开发者和接入验证使用，先把目录、Key 和试验台跑通。',
      en: 'For individual developers and initial validation. Start by getting the catalog, keys, and Playground working.',
    },
    price: { zh: '按量', en: 'Usage' },
    unit: { zh: '/验证', en: '/validation' },
    cta: { zh: '开始试用', en: 'Start Free' },
    href: '/login',
    tone: 'default',
    features: [
      { zh: '快速注册与统一登录', en: 'Fast signup and unified sign-in' },
      { zh: '单账号接入与试验台验证', en: 'Single-account access and Playground validation' },
      { zh: '基础用量与账单查看', en: 'Basic usage and billing visibility' },
      { zh: '动态开发者文档', en: 'Dynamic developer documentation' },
    ],
  },
  {
    key: 'scale',
    name: { zh: '成长版', en: 'Scale' },
    desc: {
      zh: '给准备让团队真实接入与协作的阶段，把组织、账本和权限收进控制台。',
      en: 'For teams preparing to integrate for real, with organization controls, ledgers, and permissions in one console.',
    },
    price: { zh: '团队', en: 'Team' },
    unit: { zh: '/协作', en: '/collab' },
    cta: { zh: '进入控制台', en: 'Open Console' },
    href: '/dashboard/overview',
    featured: true,
    badge: { zh: '当前推荐', en: 'Current Focus' },
    tone: 'featured',
    features: [
      { zh: '统一多模型调用', en: 'Unified multi-model access' },
      { zh: '组织与 API Key 管理', en: 'Organization and API key management' },
      { zh: '组织账本、充值与订单', en: 'Organization ledger, recharge, and orders' },
      { zh: '试验台与动态文档联动', en: 'Playground and dynamic docs working together' },
    ],
  },
  {
    key: 'enterprise',
    name: { zh: '企业版', en: 'Enterprise' },
    desc: {
      zh: '给需要采购、对账、SLA、权限边界和运营支持的团队。',
      en: 'For teams that need procurement, reconciliation, SLA, permission boundaries, and operational support.',
    },
    price: { zh: '定制', en: 'Custom' },
    unit: { zh: '', en: '' },
    cta: { zh: '联系销售', en: 'Contact Sales' },
    href: '/contact',
    tone: 'support',
    features: [
      { zh: '专属额度与结算方案', en: 'Dedicated quota and settlement strategy' },
      { zh: '更细权限边界与履约支持', en: 'Finer permission boundaries and delivery support' },
      { zh: '运营处理、对账与 SLA', en: 'Operational handling, reconciliation, and SLA' },
      { zh: '企业对接与支持协同', en: 'Enterprise onboarding and support coordination' },
    ],
  },
];
