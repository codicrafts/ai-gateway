import {
  getMonitoringAlerts,
  getMonitoringChannels,
  getMonitoringSummary,
  getMonitoringTrends,
  type OneApiMonitoringAlert,
  type OneApiMonitoringChannelHealth,
  type OneApiMonitoringSummary,
  type OneApiMonitoringTrendPoint,
} from '@/lib/oneapi';

export type RuntimeMonitoringSnapshot = {
  summary: OneApiMonitoringSummary | null;
  alerts: OneApiMonitoringAlert[];
  trends: OneApiMonitoringTrendPoint[];
  channels: OneApiMonitoringChannelHealth[];
  refreshed_at: string;
};

export async function getRuntimeMonitoringSnapshot(options?: {
  hours?: number;
  channelLimit?: number;
}): Promise<RuntimeMonitoringSnapshot> {
  const hours = Math.min(72, Math.max(6, options?.hours ?? 24));
  const channelLimit = Math.min(20, Math.max(4, options?.channelLimit ?? 10));

  const [summaryResult, alertsResult, trendsResult, channelsResult] = await Promise.all([
    getMonitoringSummary(),
    getMonitoringAlerts(),
    getMonitoringTrends(hours),
    getMonitoringChannels(channelLimit),
  ]);

  if (!summaryResult.success) {
    throw new Error(summaryResult.message || '获取运行时监控摘要失败');
  }
  if (!alertsResult.success) {
    throw new Error(alertsResult.message || '获取运行时监控告警失败');
  }
  if (!trendsResult.success) {
    throw new Error(trendsResult.message || '获取运行时监控趋势失败');
  }
  if (!channelsResult.success) {
    throw new Error(channelsResult.message || '获取运行时渠道健康失败');
  }

  return {
    summary: summaryResult.data || null,
    alerts: Array.isArray(alertsResult.data?.items) ? alertsResult.data.items : [],
    trends: Array.isArray(trendsResult.data?.items) ? trendsResult.data.items : [],
    channels: Array.isArray(channelsResult.data?.items) ? channelsResult.data.items : [],
    refreshed_at: new Date().toISOString(),
  };
}
