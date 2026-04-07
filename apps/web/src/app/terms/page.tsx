import type { Metadata } from 'next';
import LegalPageClient from '@/components/legal/LegalPageClient';
import { buildPageMetadata } from '@/config/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'Terms of Service | MeshRouter',
  description: 'Review the terms that govern the use of MeshRouter products, APIs, billing, and team features.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <LegalPageClient
      eyebrow="法律文件"
      title="服务条款"
      subtitle="本页面说明你在使用 MeshRouter 官网、控制台、团队协作能力和模型接口服务时应遵守的基本规则。"
      updatedAt="2026-04-03"
      sections={[
        {
          title: '服务范围',
          body: [
            'MeshRouter 提供统一的模型接入、团队与组织管理、API Key 管理、账单结算以及开发者调试能力。不同功能模块的开放范围、计费方式和可用模型可能会随产品版本调整。',
            '平台公开展示的模型目录用于介绍和选型，不必然等同于当前组织已启用的运行时模型。实际可调用范围以控制台配置和运行时权限为准。',
          ],
        },
        {
          title: '账户与团队责任',
          body: [
            '你应妥善保管账户凭证、验证码、双因素认证设备和 API Key。因管理不当导致的泄露、超额调用或团队误操作，平台有权按既有账务与审计记录进行处理。',
            '团队所有者和管理员应确保成员权限设置符合内部授权要求，不得利用平台功能进行越权访问、恶意攻击、滥用资源或规避计费。',
          ],
        },
        {
          title: '调用与计费',
          body: [
            '平台会根据模型调用、Token 消耗、组织账本和支付订单生成相应费用。充值、额度、账务流水和运行时消耗记录可能存在短暂同步延迟，但最终以组织账本和支付确认结果为准。',
            '如遇支付异常、接口滥用、风控命中或法律要求，平台可暂停相关 Key、团队能力或订单处理，并在必要时要求补充验证材料。',
          ],
        },
        {
          title: '禁止行为与责任限制',
          body: [
            '你不得使用平台从事违法违规、侵害第三方权益、攻击基础设施、盗刷额度、规避限流或违反适用模型供应商政策的行为。',
            '在适用法律允许的范围内，平台不对因第三方模型波动、上游服务中断、不可抗力或用户自行配置错误导致的间接损失承担责任，但我们会尽合理努力提供监控、告警和审计支持。',
          ],
        },
      ]}
    />
  );
}
