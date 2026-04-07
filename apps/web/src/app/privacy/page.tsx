import type { Metadata } from 'next';
import LegalPageClient from '@/components/legal/LegalPageClient';
import { buildPageMetadata } from '@/config/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'Privacy Policy | MeshRouter',
  description: 'Understand how MeshRouter collects, uses, stores, and protects personal and usage data.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <LegalPageClient
      eyebrow="法律文件"
      title="隐私政策"
      subtitle="本页面说明 MeshRouter 在官网、控制台和模型接入服务中如何收集、使用、保存和保护你的个人信息与业务数据。"
      updatedAt="2026-04-03"
      sections={[
        {
          title: '我们收集哪些信息',
          body: [
            '当你注册账户、加入团队、提交商务咨询或在控制台使用 API Key、账单和团队管理功能时，我们会收集你主动提供的资料，例如邮箱、手机号、昵称、团队名称以及支付和发票相关信息。',
            '当你调用平台接口时，我们还会记录必要的运行数据，例如请求时间、模型名称、Token 用量、错误状态和安全审计记录。这些信息用于计费、风控、排障和服务优化。',
          ],
        },
        {
          title: '我们如何使用这些信息',
          body: [
            '我们仅在提供服务所必需的范围内使用你的信息，包括账户认证、团队协作、权限控制、账单结算、支付处理、运维监控和客户支持。',
            '如果你通过联系页面提交需求，我们会将线索数据用于商务跟进和交付沟通，不会在未经授权的情况下将你的信息出售给第三方。',
          ],
        },
        {
          title: '数据存储与安全',
          body: [
            '我们会采取合理的技术与管理措施保护账户、团队、账本和接口访问数据，包括访问控制、审计记录、密钥掩码显示和服务端权限隔离。',
            '涉及运行时调用的数据可能会在平台底层网关中产生执行日志，用于计费和故障排查，但组织级账单和权限数据仍由平台产品层独立维护。',
          ],
        },
        {
          title: '共享与保留',
          body: [
            '除非法律要求、支付履约或为实现服务功能所必须，我们不会向无关第三方披露你的个人信息。必要的支付、通知或基础设施供应商仅会接触完成服务所需的最小数据。',
            '我们会在满足法律义务、账务核对、审计留存和客户服务的合理期限内保留相关数据。你可以通过联系我们申请更正或删除部分信息，但受法律或财务记录要求限制的数据除外。',
          ],
        },
      ]}
    />
  );
}
