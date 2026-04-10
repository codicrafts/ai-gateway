'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import EditorialSelect from '@/components/ui/EditorialSelect';
import { useAppDialog } from '@/components/ui/AppDialogProvider';
import type { AuthAudience } from '@/lib/auth-region';
import { logoutUser } from '@/lib/logout';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';
import {
  createApiKey,
  confirmPaymentOrder as confirmPaymentOrderAction,
  createPaymentOrder as createPaymentOrderAction,
  deleteApiKey as deleteApiKeyAction,
  fetchApiKeySecret,
  fetchApiKeys,
  fetchBillingSummary,
  fetchPaymentOrders,
  fetchRuntimeMonitoring,
  fetchUsageLogs,
  hydrateDashboardSnapshot,
  updateApiKey,
  type PaymentMethod,
  type PaymentOrder,
} from '@/store/slices/dashboardSlice';
import { showNotification } from '@/store/slices/notificationSlice';
import {
  createTeam,
  updateTeam,
  deleteTeam,
  updateMemberRole,
  removeMember,
  transferOwnership,
  exportAuditLogs,
  hydrateTeamWorkspace,
} from '@/store/slices/teamSlice';
import { formatDate, formatCurrency, formatBillingLineAmount, copyToClipboard } from '@/utils/helpers';
import {
  TeamRole,
  AuditAction,
  CreateTeamRequest,
  UpdateTeamRequest,
  CreateTeamInvitationResponse,
  CancelTeamInvitationResponse,
} from '@ai-gateway/shared-types/team';
import type { User } from '@ai-gateway/shared-types';
import TeamInfoCard from '@/components/team/TeamInfoCard';
import MemberList from '@/components/team/MemberList';
import PendingInvitationList from '@/components/team/PendingInvitationList';
import AuditLogList from '@/components/team/AuditLogList';
import CreateTeamModal from '@/components/team/CreateTeamModal';
import InviteModal from '@/components/team/InviteModal';
import TeamSettingsModal from '@/components/team/TeamSettingsModal';
import TransferOwnerModal from '@/components/team/TransferOwnerModal';
import JoinApplicationsPanel from '@/components/team/JoinApplicationsPanel';
import TeamDirectoryPanel from '@/components/team/TeamDirectoryPanel';
import PhoneBindingCard from '@/components/account/PhoneBindingCard';
import TwoFactorCard from '@/components/account/TwoFactorCard';
import type { DashboardPageBootstrapPayload } from '@/services/dashboard/dashboard-page-bootstrap.service';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { QRCodeSVG } from 'qrcode.react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement);

export type DashboardSection = 'overview' | 'api-keys' | 'usage' | 'billing' | 'profile' | 'team';

type DashboardClientProps = {
  section: DashboardSection;
  initialBootstrap?: DashboardPageBootstrapPayload | null;
  authAudience?: AuthAudience;
};

const API_KEY_PERMISSION_SCOPE_ITEMS = [
  { value: 'chat', zh: '对话补全', en: 'Chat Completions' },
  { value: 'responses', zh: 'Responses 接口', en: 'Responses API' },
  { value: 'embeddings', zh: '向量嵌入', en: 'Embeddings' },
  { value: 'images', zh: '图像生成', en: 'Images' },
  { value: 'audio', zh: '音频接口', en: 'Audio' },
  { value: 'video', zh: '视频生成', en: 'Video' },
  { value: 'rerank', zh: '重排序', en: 'Rerank' },
  { value: 'models.read', zh: '读取模型列表', en: 'Read Models' },
] as const;

export default function DashboardClient({
  section,
  initialBootstrap = null,
  authAudience = 'global',
}: DashboardClientProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { confirm: confirmDialog, alert: alertDialog } = useAppDialog();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser, isLoggedIn, loading: authLoading } = useAppSelector((s) => s.auth);
  const { apiKeys, availableModels, usageLogs, usageStats, monthlyRequests, monthlyCost, billingSummary, paymentOrders, monitoring } = useAppSelector((s) => s.dashboard);
  const locale = useAppSelector((s) => s.locale.locale);
  const isZh = locale === 'zh';
  const tr = useCallback((zh: string, en: string) => (isZh ? zh : en), [isZh]);
  const getErrorMessage = useCallback((error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string' && error.trim().length > 0) return error;
    return fallback;
  }, []);
  const getPaymentMethodLabel = useCallback((method: PaymentMethod) => {
    switch (method) {
      case 'alipay':
        return tr('支付宝', 'Alipay');
      case 'wechat_pay':
        return tr('微信支付', 'WeChat Pay');
      case 'credit_card':
        return tr('信用卡', 'Credit Card');
      default:
        return 'PayPal';
    }
  }, [tr]);
  const getUsageLogSummary = useCallback((log: { error_message?: string | null; runtime_content?: string | null }) => {
    const raw = log.error_message || log.runtime_content || '';
    const compact = raw.replace(/\s+/g, ' ').trim();
    if (!compact) {
      return null;
    }
    return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact;
  }, []);
  const openUsageLogDetail = useCallback(async (log: {
    id: number;
    model: string;
    status: 'success' | 'failed';
    api_key_name: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    quota_cost: number;
    created_at: string;
    error_message?: string | null;
    runtime_channel_id?: number | null;
    runtime_request_id?: string | null;
    runtime_content?: string | null;
    runtime_use_time?: number | null;
    runtime_is_stream?: boolean;
    runtime_other?: Record<string, unknown> | null;
  }) => {
    const lines = [
      `${tr('日志 ID', 'Log ID')}: ${log.id}`,
      `${tr('时间', 'Time')}: ${formatDate(log.created_at)}`,
      `${tr('模型', 'Model')}: ${log.model}`,
      `${tr('状态', 'Status')}: ${log.status === 'failed' ? tr('失败', 'Failed') : tr('成功', 'Success')}`,
      `${tr('API 密钥', 'API Key')}: ${log.api_key_name}`,
      `${tr('输入 Token', 'Input Tokens')}: ${log.prompt_tokens.toLocaleString()}`,
      `${tr('输出 Token', 'Output Tokens')}: ${log.completion_tokens.toLocaleString()}`,
      `${tr('总 Token', 'Total Tokens')}: ${log.total_tokens.toLocaleString()}`,
      `${tr('费用', 'Cost')}: ${formatCurrency(log.quota_cost)}`,
      `${tr('渠道 ID', 'Channel ID')}: ${log.runtime_channel_id ?? '-'}`,
      `${tr('请求 ID', 'Request ID')}: ${log.runtime_request_id || '-'}`,
      `${tr('流式请求', 'Streaming')}: ${log.runtime_is_stream ? tr('是', 'Yes') : tr('否', 'No')}`,
      `${tr('耗时', 'Latency')}: ${
        typeof log.runtime_use_time === 'number' && Number.isFinite(log.runtime_use_time)
          ? `${log.runtime_use_time} ms`
          : '-'
      }`,
      `${tr('错误信息', 'Error')}: ${log.error_message || '-'}`,
      '',
      `${tr('原始摘要', 'Raw Summary')}:`,
      log.runtime_content || tr('暂无原始内容', 'No raw summary'),
    ];

    if (log.runtime_other && Object.keys(log.runtime_other).length > 0) {
      lines.push('', `${tr('附加信息', 'Additional Metadata')}:`, JSON.stringify(log.runtime_other, null, 2));
    }

    await alertDialog({
      title: tr('请求日志详情', 'Request Log Detail'),
      message: lines.join('\n'),
      confirmText: tr('关闭', 'Close'),
    });
  }, [alertDialog, tr]);
  // 团队管理 Redux 状态
  const { 
    currentTeam, 
    teams, 
    members, 
    auditLogs: teamAuditLogs, 
    invitations: teamInvitations,
    loading: teamLoading 
  } = useAppSelector((s) => s.team);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState<PaymentOrder | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showEditKeyModal, setShowEditKeyModal] = useState(false);
  const [editingKey, setEditingKey] = useState<typeof apiKeys[0] | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('100');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('alipay');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [keyName, setKeyName] = useState('');
  const [keyRemark, setKeyRemark] = useState('');
  const [keyExpiry, setKeyExpiry] = useState('');
  const [keyModels, setKeyModels] = useState<string[]>([]);
  const [keyIpWhitelist, setKeyIpWhitelist] = useState('');
  const [keyPermissionScopes, setKeyPermissionScopes] = useState<string[]>([]);
  const [copyingFullKeyId, setCopyingFullKeyId] = useState<number | null>(null);
  const [apiKeyModelOptions, setApiKeyModelOptions] = useState<string[]>([]);
  const [apiKeyModelOptionsLoading, setApiKeyModelOptionsLoading] = useState(false);
  const [usageSyncing, setUsageSyncing] = useState(false);
  const [trendRange, setTrendRange] = useState<'7d' | '30d'>('7d');
  const [editKeyStatus, setEditKeyStatus] = useState<'active' | 'disabled'>('active');
  const [profileData, setProfileData] = useState({ nickname: '', phone: '', avatar: '' });
  const [passwordData, setPasswordData] = useState({ current: '', newPass: '', confirm: '' });
  
  // 团队管理弹窗状态
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showTeamSettingsModal, setShowTeamSettingsModal] = useState(false);
  const [showTransferOwnerModal, setShowTransferOwnerModal] = useState(false);
  const [teamActiveTab, setTeamActiveTab] = useState<'members' | 'applications' | 'audit' | 'settings'>('members');
  // 团队成员列表筛选状态
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<TeamRole | null>(null);
  
  // 审计日志筛选状态
  const [auditStartDate, setAuditStartDate] = useState<string | null>(null);
  const [auditEndDate, setAuditEndDate] = useState<string | null>(null);
  const [auditActionFilter, setAuditActionFilter] = useState<AuditAction | null>(null);
  
  const [initialDataReady, setInitialDataReady] = useState(Boolean(initialBootstrap));
  const [routeRefreshing, setRouteRefreshing] = useState(false);
  const apiKeyModelsRequestedRef = useRef(false);
  const usageSyncRequestKeyRef = useRef<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const activeTeamId =
    currentTeam?.id ||
    initialBootstrap?.dashboard.team_id ||
    initialBootstrap?.team.current_team?.id ||
    searchParams?.get('team') ||
    null;
  const isDomesticAudience = authAudience === 'domestic';
  const visiblePaymentMethods = useMemo<PaymentMethod[]>(
    () => (isDomesticAudience ? ['alipay', 'wechat_pay'] : ['credit_card', 'paypal']),
    [isDomesticAudience]
  );
  const paymentMethodGroupLabel = isDomesticAudience
    ? tr('国内支付', 'Domestic Payments')
    : tr('国际支付', 'International Payments');

  const buildDashboardHref = useCallback((basePath: string, nextTeamId?: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (nextTeamId) {
      params.set('team', nextTeamId);
    } else {
      params.delete('team');
    }
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }, [searchParams]);

  const refreshDashboardRoute = useCallback((nextTeamId?: string | null, nextPathname?: string) => {
    const targetPath = nextPathname || pathname;
    const currentTeamId = searchParams?.get('team') ?? initialBootstrap?.dashboard.team_id ?? currentTeam?.id ?? null;
    const currentHref = buildDashboardHref(pathname, currentTeamId);
    const nextHref = buildDashboardHref(targetPath, nextTeamId ?? currentTeamId);

    setInitialDataReady(false);
    setRouteRefreshing(true);

    if (nextHref !== currentHref) {
      router.push(nextHref);
      return;
    }

    router.refresh();
  }, [buildDashboardHref, currentTeam?.id, initialBootstrap?.dashboard.team_id, pathname, router, searchParams]);

  useEffect(() => {
    if (currentUser) {
      const displayName = currentUser.name || currentUser.username || '';
      const avatarValue = currentUser.image && currentUser.image.trim().length > 0
        ? currentUser.image
        : displayName.charAt(0).toUpperCase() || 'U';
      setProfileData({
        nickname: displayName,
        phone: currentUser.phone || '',
        avatar: avatarValue,
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (!initialBootstrap) {
      setInitialDataReady(false);
      return;
    }

    dispatch(hydrateTeamWorkspace({
      teams: initialBootstrap.team.teams,
      currentTeam: initialBootstrap.team.current_team,
      members: initialBootstrap.team.members,
      auditLogs: initialBootstrap.team.audit_logs,
      invitations: initialBootstrap.team.invitations,
    }));

    dispatch(hydrateDashboardSnapshot({
      apiKeys: initialBootstrap.dashboard.api_keys,
      availableModels: initialBootstrap.dashboard.available_models,
      usageLogs: initialBootstrap.dashboard.usage.logs,
      usageStats: initialBootstrap.dashboard.usage.stats,
      billingSummary: initialBootstrap.dashboard.billing_summary,
      paymentOrders: initialBootstrap.dashboard.payment_orders,
      monitoring: initialBootstrap.dashboard.monitoring,
    }));

    setRouteRefreshing(false);
    setInitialDataReady(true);
  }, [dispatch, initialBootstrap]);

  useEffect(() => {
    if (!initialDataReady || section !== 'usage') {
      return;
    }

    void dispatch(fetchRuntimeMonitoring());
  }, [dispatch, initialDataReady, section]);

  useEffect(() => {
    if (availableModels.length === 0) return;
    const nextOptions = availableModels.map((model) => model.model_name).filter(Boolean);
    if (nextOptions.length > 0) {
      setApiKeyModelOptions(nextOptions);
      apiKeyModelsRequestedRef.current = true;
    }
  }, [availableModels]);

  useEffect(() => {
    if (!visiblePaymentMethods.includes(selectedPaymentMethod)) {
      setSelectedPaymentMethod(visiblePaymentMethods[0]);
    }
  }, [selectedPaymentMethod, visiblePaymentMethods]);

  useEffect(() => {
    if (!checkoutOrder) {
      return;
    }

    const latestOrder = paymentOrders.find((order) => order.id === checkoutOrder.id);
    if (latestOrder && latestOrder !== checkoutOrder) {
      setCheckoutOrder(latestOrder);
    }
  }, [checkoutOrder, paymentOrders]);

  useEffect(() => {
    if (!initialDataReady || !activeTeamId) {
      setUsageSyncing(false);
      return;
    }
    if (!['overview', 'usage', 'billing', 'api-keys'].includes(section)) return;

    const requestKey = `${section}:${activeTeamId}`;
    const syncFailedMessage = isZh ? '同步用量失败' : 'Failed to sync usage';

    if (usageSyncRequestKeyRef.current === requestKey) {
      return;
    }

    usageSyncRequestKeyRef.current = requestKey;

    let cancelled = false;
    setUsageSyncing(true);

    const run = async () => {
      try {
        const response = await fetch('/api/runtime-sync/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team_id: activeTeamId }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || syncFailedMessage);
        }
        if (!cancelled) {
          if (section === 'usage') {
            await Promise.all([
              dispatch(fetchUsageLogs(activeTeamId)).unwrap(),
              dispatch(fetchRuntimeMonitoring()).unwrap(),
            ]);
          } else if (section === 'billing') {
            await Promise.all([
              dispatch(fetchUsageLogs(activeTeamId)).unwrap(),
              dispatch(fetchBillingSummary(activeTeamId)).unwrap(),
              dispatch(fetchPaymentOrders(activeTeamId)).unwrap(),
            ]);
          } else if (section === 'api-keys') {
            await Promise.all([
              dispatch(fetchApiKeys(activeTeamId)).unwrap(),
              dispatch(fetchUsageLogs(activeTeamId)).unwrap(),
            ]);
          } else {
            await Promise.all([
              dispatch(fetchApiKeys(activeTeamId)).unwrap(),
              dispatch(fetchUsageLogs(activeTeamId)).unwrap(),
              dispatch(fetchBillingSummary(activeTeamId)).unwrap(),
              dispatch(fetchPaymentOrders(activeTeamId)).unwrap(),
            ]);
          }
        }
      } catch (error) {
        usageSyncRequestKeyRef.current = null;
        if (!cancelled) {
          dispatch(showNotification({
            message: error instanceof Error ? error.message : syncFailedMessage,
            type: 'error',
          }));
        }
      } finally {
        if (!cancelled) {
          setUsageSyncing(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (usageSyncRequestKeyRef.current === requestKey) {
        usageSyncRequestKeyRef.current = null;
      }
    };
  }, [activeTeamId, dispatch, initialDataReady, isZh, section]);

  // 获取当前用户在当前团队中的角色
  const getCurrentUserRole = useCallback((): TeamRole => {
    if (!currentTeam || !currentUser) return 'guest';
    const currentTeamItem = teams.find(t => t.id === currentTeam.id);
    return currentTeamItem?.user_role || 'guest';
  }, [currentTeam, currentUser, teams]);
  const currentUserRole = getCurrentUserRole();
  const canManageTeam = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleUserUpdated = useCallback((user: User) => {
    dispatch(setUser(user));
    setProfileData((previous) => ({
      ...previous,
      nickname: user.name || user.username || previous.nickname,
      phone: user.phone || '',
      avatar:
        user.image && user.image.trim().length > 0
          ? user.image
          : (user.name || user.username || previous.avatar || 'U').charAt(0).toUpperCase(),
    }));
  }, [dispatch]);

  // 团队管理回调函数
  const handleCreateTeam = useCallback(async (data: CreateTeamRequest) => {
    try {
      const createdTeam = await dispatch(createTeam(data)).unwrap();
      dispatch(showNotification({ message: tr('团队创建成功', 'Team created successfully') }));
      setShowCreateTeamModal(false);
      refreshDashboardRoute(createdTeam.id, '/dashboard/team');
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('创建团队失败', 'Failed to create team')), type: 'error' }));
    }
  }, [dispatch, getErrorMessage, refreshDashboardRoute, tr]);

  const handleUpdateTeam = useCallback(async (data: UpdateTeamRequest) => {
    if (!currentTeam) return;
    try {
      await dispatch(updateTeam({ teamId: currentTeam.id, request: data })).unwrap();
      dispatch(showNotification({ message: tr('团队设置已保存', 'Team settings saved') }));
      setShowTeamSettingsModal(false);
      refreshDashboardRoute(currentTeam.id);
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('更新团队失败', 'Failed to update team')), type: 'error' }));
    }
  }, [currentTeam, dispatch, getErrorMessage, refreshDashboardRoute, tr]);

  const handleInviteMember = useCallback(async (email: string, role: Exclude<TeamRole, 'owner'>) => {
    if (!currentTeam) return;
    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const result: CreateTeamInvitationResponse = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || tr('邀请成员失败', 'Failed to invite member'));
      }

      setShowInviteModal(false);
      dispatch(showNotification({
        message: isZh ? `已向 ${email} 创建邀请链接` : `Invitation created for ${email}`,
      }));
      if (result.data.invite_url) {
        copyToClipboard(result.data.invite_url);
        dispatch(showNotification({
          message: tr('邀请链接已复制到剪贴板', 'Invite link copied to clipboard'),
        }));
      }
      refreshDashboardRoute(currentTeam.id);
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('邀请成员失败', 'Failed to invite member')), type: 'error' }));
    }
  }, [currentTeam, dispatch, getErrorMessage, isZh, refreshDashboardRoute, tr]);

  const handleUpdateMemberRole = useCallback(async (userId: string, newRole: TeamRole) => {
    if (!currentTeam || newRole === 'owner') return;
    try {
      await dispatch(updateMemberRole({ 
        teamId: currentTeam.id, 
        userId, 
        request: { role: newRole as Exclude<TeamRole, 'owner'> } 
      })).unwrap();
      dispatch(showNotification({ message: tr('角色已更新', 'Role updated') }));
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('更新角色失败', 'Failed to update role')), type: 'error' }));
    }
  }, [currentTeam, dispatch, getErrorMessage, tr]);

  const handleRemoveMember = useCallback(async (userId: string) => {
    if (!currentTeam) return;
    const member = members.find(m => m.user_id === userId);
    const memberName = member?.user?.username || tr('该成员', 'this member');
    const confirmed = await confirmDialog({
      title: tr('移除成员', 'Remove member'),
      message: isZh ? `确定移除成员 "${memberName}"？` : `Remove member "${memberName}"?`,
      confirmText: tr('移除', 'Remove'),
      cancelText: tr('取消', 'Cancel'),
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await dispatch(removeMember({ teamId: currentTeam.id, userId })).unwrap();
      dispatch(showNotification({ message: isZh ? `已移除 ${memberName}` : `${memberName} removed` }));
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('移除成员失败', 'Failed to remove member')), type: 'error' }));
    }
  }, [confirmDialog, currentTeam, members, dispatch, getErrorMessage, isZh, tr]);

  const handleTransferOwnership = useCallback(async (newOwnerId: string) => {
    if (!currentTeam) return;
    try {
      await dispatch(transferOwnership({ teamId: currentTeam.id, request: { new_owner_id: newOwnerId } })).unwrap();
      dispatch(showNotification({ message: tr('所有权转让成功', 'Ownership transferred successfully') }));
      setShowTransferOwnerModal(false);
      refreshDashboardRoute(currentTeam.id);
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('转让所有权失败', 'Failed to transfer ownership')), type: 'error' }));
    }
  }, [currentTeam, dispatch, getErrorMessage, refreshDashboardRoute, tr]);

  const handleExportAuditLogs = useCallback(async () => {
    if (!currentTeam) return;
    try {
      const result = await dispatch(exportAuditLogs({ 
        teamId: currentTeam.id, 
        query: { start_date: auditStartDate || undefined, end_date: auditEndDate || undefined } 
      })).unwrap();
      if (result) {
        // 创建下载链接
        const blob = new Blob([result.content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        dispatch(showNotification({ message: tr('审计日志导出成功', 'Audit logs exported') }));
      }
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('导出审计日志失败', 'Failed to export audit logs')), type: 'error' }));
    }
  }, [currentTeam, auditStartDate, auditEndDate, dispatch, getErrorMessage, tr]);

  const handleSelectTeam = useCallback((teamId: string) => {
    refreshDashboardRoute(teamId);
  }, [refreshDashboardRoute]);

  const handleCancelInvitation = useCallback(async (invitationId: string, email: string) => {
    if (!currentTeam) return;
    const confirmed = await confirmDialog({
      title: tr('取消邀请', 'Cancel invitation'),
      message: isZh ? `确定取消发给 ${email} 的邀请？` : `Cancel the invitation sent to ${email}?`,
      confirmText: tr('取消邀请', 'Cancel invite'),
      cancelText: tr('返回', 'Back'),
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/invitations/${invitationId}`, {
        method: 'DELETE',
      });
      const result: CancelTeamInvitationResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || tr('取消邀请失败', 'Failed to cancel invitation'));
      }

      dispatch(showNotification({
        message: isZh ? `已取消 ${email} 的邀请` : `Invitation cancelled for ${email}`,
      }));
      refreshDashboardRoute(currentTeam.id);
    } catch (error) {
      dispatch(showNotification({
        message: getErrorMessage(error, tr('取消邀请失败', 'Failed to cancel invitation')),
        type: 'error',
      }));
    }
  }, [confirmDialog, currentTeam, dispatch, getErrorMessage, isZh, refreshDashboardRoute, tr]);

  const handleLeaveTeam = useCallback(async () => {
    if (!currentTeam || !currentUser) return;
    const confirmed = await confirmDialog({
      title: tr('退出团队', 'Leave team'),
      message: isZh ? `确定退出团队 "${currentTeam.name}"？` : `Leave team "${currentTeam.name}"?`,
      confirmText: tr('退出', 'Leave'),
      cancelText: tr('取消', 'Cancel'),
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await dispatch(removeMember({ teamId: currentTeam.id, userId: currentUser.id })).unwrap();
      dispatch(showNotification({ message: tr('已退出当前团队', 'You left the team') }));
      refreshDashboardRoute(null);
    } catch (error) {
      dispatch(showNotification({
        message: getErrorMessage(error, tr('退出团队失败', 'Failed to leave team')),
        type: 'error',
      }));
    }
  }, [confirmDialog, currentTeam, currentUser, dispatch, getErrorMessage, isZh, refreshDashboardRoute, tr]);

  const handleApplyToJoinTeam = useCallback(async (payload: {
    slug: string;
    requestedRole: Extract<TeamRole, 'member' | 'guest'>;
    message?: string;
  }) => {
    try {
      const response = await fetch('/api/teams/join-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: payload.slug,
          requested_role: payload.requestedRole,
          message: payload.message,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || tr('提交加入申请失败', 'Failed to submit join request'));
      }
      dispatch(showNotification({ message: tr('加入申请已提交', 'Join request submitted') }));
      refreshDashboardRoute(currentTeam?.id || null, '/dashboard/team');
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('提交加入申请失败', 'Failed to submit join request')), type: 'error' }));
    }
  }, [currentTeam?.id, dispatch, getErrorMessage, refreshDashboardRoute, tr]);

  const handleReviewJoinApplication = useCallback(async (applicationId: string, decision: 'approve' | 'reject') => {
    if (!currentTeam) return;
    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/join-applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || tr('处理加入申请失败', 'Failed to process join request'));
      }
      dispatch(showNotification({
        message: decision === 'approve'
          ? tr('已批准加入申请', 'Join request approved')
          : tr('已拒绝加入申请', 'Join request rejected'),
      }));
      refreshDashboardRoute(currentTeam.id, '/dashboard/team');
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('处理加入申请失败', 'Failed to process join request')), type: 'error' }));
    }
  }, [currentTeam, dispatch, getErrorMessage, refreshDashboardRoute, tr]);

  const handleCreateKey = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    try {
      const result = await dispatch(createApiKey({
        team_id: activeTeamId ?? null,
        name: keyName,
        remark: keyRemark || null,
        subnet: keyIpWhitelist || null,
        permission_scopes: keyPermissionScopes,
        expires_at: keyExpiry || null,
        unlimited_quota: true,
        models: keyModels.length > 0 ? keyModels : undefined,
      })).unwrap();
      
      dispatch(showNotification({ message: tr('API 密钥创建成功', 'API key created successfully') }));
      setNewKeyValue(result.plain_key || result.key);
      setShowCreateModal(false);
      setShowKeyModal(true);
      setKeyName('');
      setKeyRemark('');
      setKeyExpiry('');
      setKeyModels([]);
      setKeyIpWhitelist('');
      setKeyPermissionScopes([]);
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('创建失败', 'Creation failed')), type: 'error' }));
    }
  }, [activeTeamId, currentUser, keyExpiry, keyIpWhitelist, keyModels, keyName, keyPermissionScopes, keyRemark, dispatch, getErrorMessage, tr]);

  const handleCopyFullKey = useCallback(async (keyId: number) => {
    try {
      const cachedKey = apiKeys.find((item) => item.id === keyId)?.plain_key;
      if (cachedKey) {
        copyToClipboard(cachedKey);
        dispatch(showNotification({ message: tr('已复制完整密钥', 'Full key copied') }));
        return;
      }

      setCopyingFullKeyId(keyId);
      const result = await dispatch(fetchApiKeySecret({
        id: keyId,
        team_id: activeTeamId ?? null,
      })).unwrap();

      copyToClipboard(result.plain_key);
      dispatch(showNotification({ message: tr('已复制完整密钥', 'Full key copied') }));
    } catch (error) {
      dispatch(showNotification({
        message: getErrorMessage(error, tr('获取完整密钥失败', 'Failed to fetch full key')),
        type: 'error',
      }));
    } finally {
      setCopyingFullKeyId((current) => (current === keyId ? null : current));
    }
  }, [activeTeamId, apiKeys, dispatch, getErrorMessage, tr]);

  const handleCreatePaymentOrder = useCallback(async () => {
    const amount = Number(rechargeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      dispatch(showNotification({ message: tr('请输入有效充值金额', 'Please enter a valid amount'), type: 'error' }));
      return;
    }

    try {
      const order = await dispatch(createPaymentOrderAction({
        team_id: activeTeamId ?? null,
        amount,
        payment_method: selectedPaymentMethod,
      })).unwrap();

      setCheckoutOrder(order);
      dispatch(showNotification({
        message: isZh
          ? `充值订单已创建，请继续完成 ${getPaymentMethodLabel(order.payment_method)} 支付`
          : `Top-up order created. Continue with ${getPaymentMethodLabel(order.payment_method)} to complete payment.`,
      }));
      setShowRechargeModal(false);
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('创建充值订单失败', 'Failed to create top-up order')), type: 'error' }));
    }
  }, [activeTeamId, dispatch, getErrorMessage, rechargeAmount, selectedPaymentMethod, isZh, getPaymentMethodLabel, tr]);

  const handleOpenCheckoutOrder = useCallback((order: PaymentOrder) => {
    setCheckoutOrder(order);
  }, []);

  const handleOpenCheckoutUrl = useCallback((order: PaymentOrder) => {
    const checkoutUrl = order.checkout_action?.url;
    if (!checkoutUrl) {
      return;
    }

    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const handleRefreshPaymentStatus = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchPaymentOrders(activeTeamId ?? null)).unwrap(),
        dispatch(fetchBillingSummary(activeTeamId ?? null)).unwrap(),
      ]);
      dispatch(showNotification({ message: tr('已刷新支付状态', 'Payment status refreshed') }));
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('刷新支付状态失败', 'Failed to refresh payment status')), type: 'error' }));
    }
  }, [activeTeamId, dispatch, getErrorMessage, tr]);

  const ensureApiKeyModelOptionsLoaded = useCallback(async () => {
    if (apiKeyModelsRequestedRef.current) return;
    apiKeyModelsRequestedRef.current = true;
    setApiKeyModelOptionsLoading(true);
    try {
      const response = await fetch('/api/gateway/models');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || tr('获取模型列表失败', 'Failed to load models'));
      }
      const nextOptions = Array.isArray(result.data)
        ? result.data.map((model: { model_name?: string }) => model.model_name).filter(Boolean)
        : [];
      setApiKeyModelOptions(nextOptions);
    } catch (error) {
      apiKeyModelsRequestedRef.current = false;
      dispatch(showNotification({ message: getErrorMessage(error, tr('获取模型列表失败', 'Failed to load models')), type: 'error' }));
    } finally {
      setApiKeyModelOptionsLoading(false);
    }
  }, [dispatch, getErrorMessage, tr]);

  const openCreateKeyModal = useCallback(() => {
    setShowCreateModal(true);
    void ensureApiKeyModelOptionsLoaded();
  }, [ensureApiKeyModelOptionsLoaded]);

  const handleConfirmPaymentOrder = useCallback(async (orderId: string) => {
    try {
      await dispatch(confirmPaymentOrderAction(orderId)).unwrap();
      dispatch(showNotification({ message: tr('充值到账成功，可用额度已更新', 'Top-up applied and available balance updated') }));
      setCheckoutOrder((current) => (current?.id === orderId ? null : current));
      refreshDashboardRoute(activeTeamId);
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('确认充值订单失败', 'Failed to confirm top-up order')), type: 'error' }));
    }
  }, [activeTeamId, dispatch, getErrorMessage, refreshDashboardRoute, tr]);

  const handleToggleKeyStatus = useCallback(async (key: typeof apiKeys[0]) => {
    const newStatus = key.status === 'active' ? 'disabled' : 'active';
    try {
      await dispatch(updateApiKey({ id: key.id, team_id: activeTeamId ?? null, status: newStatus })).unwrap();
      dispatch(showNotification({ message: isZh ? `密钥已${newStatus === 'active' ? '启用' : '禁用'}` : `Key ${newStatus === 'active' ? 'enabled' : 'disabled'}` }));
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('操作失败', 'Action failed')), type: 'error' }));
    }
  }, [activeTeamId, dispatch, getErrorMessage, isZh, tr]);

  const handleEditKey = useCallback((key: typeof apiKeys[0]) => {
    setEditingKey(key);
    setKeyName(key.name);
    setKeyRemark(key.remark || '');
    setKeyModels(key.models || []);
    setKeyIpWhitelist(key.subnet || '');
    setKeyPermissionScopes(key.permission_scopes || []);
    setEditKeyStatus(key.status === 'active' ? 'active' : 'disabled');
    setShowEditKeyModal(true);
    void ensureApiKeyModelOptionsLoaded();
  }, [ensureApiKeyModelOptionsLoaded]);

  const handleSaveKeyEdit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey) return;

    try {
      await dispatch(updateApiKey({
        id: editingKey.id,
        team_id: activeTeamId ?? null,
        name: keyName,
        remark: keyRemark || null,
        subnet: keyIpWhitelist || null,
        permission_scopes: keyPermissionScopes,
        status: editKeyStatus,
        models: keyModels.length > 0 ? keyModels : [],
      })).unwrap();
      dispatch(showNotification({ message: tr('密钥信息已更新', 'Key details updated') }));
      setShowEditKeyModal(false);
      setEditingKey(null);
      setKeyName('');
      setKeyRemark('');
      setKeyModels([]);
      setKeyIpWhitelist('');
      setKeyPermissionScopes([]);
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('更新失败', 'Update failed')), type: 'error' }));
    }
  }, [activeTeamId, dispatch, editKeyStatus, editingKey, getErrorMessage, keyIpWhitelist, keyModels, keyName, keyPermissionScopes, keyRemark, tr]);

  const handleDeleteKey = useCallback(async (keyId: number, name: string) => {
    const confirmed = await confirmDialog({
      title: tr('删除 API 密钥', 'Delete API key'),
      message: isZh ? `确定删除密钥 "${name}"？` : `Delete key "${name}"?`,
      confirmText: tr('删除', 'Delete'),
      cancelText: tr('取消', 'Cancel'),
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await dispatch(deleteApiKeyAction({ keyId, teamId: activeTeamId ?? null })).unwrap();
      dispatch(showNotification({ message: tr('已删除', 'Deleted') }));
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('删除失败', 'Delete failed')), type: 'error' }));
    }
  }, [activeTeamId, confirmDialog, dispatch, getErrorMessage, isZh, tr]);

  const handleUpdateProfile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileData.nickname,
          image: profileData.avatar,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || tr('更新个人信息失败', 'Failed to update profile'));
      }

      dispatch(setUser(result.data));
      dispatch(showNotification({ message: tr('个人信息已更新', 'Profile updated') }));
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('更新个人信息失败', 'Failed to update profile')), type: 'error' }));
    }
  }, [dispatch, getErrorMessage, profileData.avatar, profileData.nickname, tr]);

  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPass !== passwordData.confirm) {
      dispatch(showNotification({ message: tr('两次密码不一致', 'Passwords do not match'), type: 'error' }));
      return;
    }
    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.current,
          nextPassword: passwordData.newPass,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || tr('修改密码失败', 'Failed to change password'));
      }

      dispatch(showNotification({ message: tr('密码修改成功', 'Password updated successfully') }));
      setShowPasswordModal(false);
      setPasswordData({ current: '', newPass: '', confirm: '' });
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('修改密码失败', 'Failed to change password')), type: 'error' }));
    }
  }, [dispatch, getErrorMessage, passwordData, tr]);

  const handleAvatarUpload = useCallback(async (file: File | null) => {
    if (!file) return;

    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/account/avatar', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || tr('上传头像失败', 'Failed to upload avatar'));
      }

      handleUserUpdated(result.data);
      setShowAvatarModal(false);
      dispatch(showNotification({ message: tr('头像已更新', 'Avatar updated') }));
    } catch (error) {
      dispatch(showNotification({
        message: getErrorMessage(error, tr('上传头像失败', 'Failed to upload avatar')),
        type: 'error',
      }));
    } finally {
      setAvatarUploading(false);
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
    }
  }, [dispatch, getErrorMessage, handleUserUpdated, tr]);

  const handleExportBilling = useCallback(async () => {
    try {
      const query = activeTeamId ? `?team_id=${encodeURIComponent(activeTeamId)}` : '';
      const response = await fetch(`/api/billing/export${query}`);
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || tr('导出账单失败', 'Failed to export billing data'));
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `billing-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      dispatch(showNotification({ message: tr('账单导出成功', 'Billing export completed') }));
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('导出账单失败', 'Failed to export billing data')), type: 'error' }));
    }
  }, [activeTeamId, dispatch, getErrorMessage, tr]);

  const handleExportUsageLogs = useCallback(async (format: 'csv' | 'pdf') => {
    try {
      const query = new URLSearchParams();
      if (activeTeamId) {
        query.set('team_id', activeTeamId);
      }
      query.set('format', format);
      query.set('limit', '200');

      const response = await fetch(`/api/gateway/usage/export?${query.toString()}`);
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || tr('导出请求日志失败', 'Failed to export request logs'));
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `request-logs-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      dispatch(showNotification({
        message: format === 'pdf'
          ? tr('请求日志 PDF 导出成功', 'Request log PDF export completed')
          : tr('请求日志 CSV 导出成功', 'Request log CSV export completed'),
      }));
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('导出请求日志失败', 'Failed to export request logs')), type: 'error' }));
    }
  }, [activeTeamId, dispatch, getErrorMessage, tr]);

  const handleDeleteAccount = useCallback(async () => {
    const confirmed = await confirmDialog({
      title: tr('删除账户', 'Delete account'),
      message: isZh ? '确定删除账户？此操作不可恢复。' : 'Delete this account permanently? This cannot be undone.',
      confirmText: tr('删除账户', 'Delete account'),
      cancelText: tr('取消', 'Cancel'),
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || tr('删除账户失败', 'Failed to delete account'));
      }

      dispatch(showNotification({ message: tr('账户已删除', 'Account deleted') }));
      await logoutUser();
      router.push('/');
      router.refresh();
    } catch (error) {
      dispatch(showNotification({ message: getErrorMessage(error, tr('删除账户失败', 'Failed to delete account')), type: 'error' }));
    }
  }, [confirmDialog, dispatch, getErrorMessage, isZh, router, tr]);

  const activeKeys = apiKeys.filter(k => k.status === 'active');
  const currentBalance = billingSummary?.current_balance ?? 0;
  const currentMonthSpend = billingSummary?.current_month_spend ?? monthlyCost;
  const changePercentage = billingSummary?.change_percentage ?? null;
  const estimatedAvailableDays = billingSummary?.estimated_available_days ?? null;
  const averageDailySpend = billingSummary?.average_daily_spend ?? 0;
  const billingEntries = billingSummary?.recent_entries ?? [];
  const pendingPaymentOrders = paymentOrders.filter((order) => order.status === 'pending').length;
  const totalPromptTokens = usageLogs.reduce((sum, log) => sum + (log.prompt_tokens || 0), 0);
  const totalCompletionTokens = usageLogs.reduce((sum, log) => sum + (log.completion_tokens || 0), 0);
  const totalTokenUsage = usageLogs.reduce((sum, log) => sum + (log.total_tokens || 0), 0);
  const averageTokensPerRequest = usageLogs.length > 0 ? Math.round(totalTokenUsage / usageLogs.length) : 0;
  const uniqueModelsUsed = new Set(usageLogs.map((log) => log.model).filter(Boolean)).size;
  const activeDays = new Set(usageLogs.map((log) => new Date(log.created_at).toDateString())).size;
  const lastActiveAt = usageLogs.length > 0
    ? usageLogs.reduce((latest, log) => {
        const timestamp = new Date(log.created_at).getTime();
        return Number.isNaN(timestamp) ? latest : Math.max(latest, timestamp);
      }, 0)
    : 0;
  const lastActiveLabel = lastActiveAt ? formatDate(new Date(lastActiveAt).toISOString()) : tr('暂无记录', 'No recent activity');
  const availableModelNames = apiKeyModelOptions;
  const apiKeyPermissionScopeOptions = API_KEY_PERMISSION_SCOPE_ITEMS.map((item) => ({
    value: item.value,
    label: tr(item.zh, item.en),
  }));
  const teamMemberCount = members.length;
  const teamAdmins = members.filter((member) => member.role === 'admin' || member.role === 'owner').length;
  const pendingInvites = teamInvitations.length;
  const pendingJoinApplications = initialBootstrap?.team.join_applications || [];
  const myJoinApplications = initialBootstrap?.team.my_join_applications || [];
  const teamPermissionRows = [
    { name: tr('查看用量统计', 'View usage metrics'), desc: tr('查看团队 API 使用情况', 'Review team API activity'), owner: true, admin: true, member: true, guest: true },
    { name: tr('使用 API', 'Use API'), desc: tr('调用 API 接口', 'Call model endpoints'), owner: true, admin: true, member: true, guest: false },
    { name: 'Create/Delete API Key', desc: tr('管理 API 密钥', 'Manage API keys'), owner: true, admin: true, member: false, guest: false },
    { name: tr('邀请/移除成员', 'Invite/Remove members'), desc: tr('管理团队成员', 'Manage team members'), owner: true, admin: true, member: false, guest: false },
    { name: tr('修改成员角色', 'Change member roles'), desc: tr('调整成员权限', 'Adjust team permissions'), owner: true, admin: false, member: false, guest: false },
    { name: tr('账单和充值', 'Billing and top-up'), desc: tr('财务相关操作', 'Handle finance-related actions'), owner: true, admin: false, member: false, guest: false },
    { name: tr('团队设置', 'Team settings'), desc: tr('修改团队信息', 'Update team information'), owner: true, admin: true, member: false, guest: false },
    { name: tr('删除团队', 'Delete team'), desc: tr('解散团队', 'Disband the team'), owner: true, admin: false, member: false, guest: false },
  ];
  const trendDays = trendRange === '30d' ? 30 : 7;
  const trendLabels = Array.from({ length: trendDays }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (trendDays - 1 - index));
    return isZh
      ? `${date.getMonth() + 1}/${date.getDate()}`
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const profileDisplayName = currentUser?.name || currentUser?.username || tr('用户', 'User');
  const avatarImageUrl = /^https?:\/\//.test(profileData.avatar) || profileData.avatar.startsWith('data:image')
    ? profileData.avatar
    : null;
  const trendFailedRequests = trendLabels.map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (trendDays - 1 - index));
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return usageLogs.filter((log) => {
      const logDate = new Date(log.created_at);
      return (
        log.status === 'failed' &&
        logDate.getFullYear() === year &&
        logDate.getMonth() === month &&
        logDate.getDate() === day
      );
    }).length;
  });
  const trendSuccessfulRequests = trendLabels.map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (trendDays - 1 - index));
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return usageLogs.filter((log) => {
      const logDate = new Date(log.created_at);
      return (
        log.status !== 'failed' &&
        logDate.getFullYear() === year &&
        logDate.getMonth() === month &&
        logDate.getDate() === day
      );
    }).length;
  });
  const modelUsagePairs = Object.entries(
    usageLogs.reduce<Record<string, number>>((accumulator, log) => {
      const key = log.model || tr('未知模型', 'Unknown');
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {})
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);
  const usageChartData = {
    labels: trendLabels,
    datasets: [
      {
        label: tr('成功请求', 'Successful Requests'),
        data: trendSuccessfulRequests,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: tr('失败请求', 'Failed Requests'),
        data: trendFailedRequests,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
        tension: 0.35,
        fill: false,
        borderDash: [6, 4]
      }
    ]
  };
  const tokenChartData = {
    labels: modelUsagePairs.length > 0 ? modelUsagePairs.map(([label]) => label) : [tr('暂无数据', 'No data')],
    datasets: [{
      data: modelUsagePairs.length > 0 ? modelUsagePairs.map(([, value]) => value) : [1],
      backgroundColor: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b'],
      borderWidth: 0
    }]
  };
  const monitoringSummary = monitoring?.summary ?? null;
  const monitoringAlerts = monitoring?.alerts ?? [];
  const monitoringTrends = monitoring?.trends ?? [];
  const monitoringChannels = monitoring?.channels ?? [];
  const formatMonitoringPercent = (value: number | null | undefined) => (
    typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '--'
  );
  const getMonitoringAlertTone = (level: string) => {
    if (level === 'critical') return 'border-danger/20 bg-danger/5 text-danger';
    if (level === 'warning') return 'border-warning/20 bg-warning/5 text-warning';
    return 'border-primary/20 bg-primary/5 text-primary';
  };
  const getChannelStatusMeta = (status: number) => {
    if (status === 1) {
      return { label: tr('在线', 'Online'), tone: 'border-success/20 bg-success/10 text-success' };
    }
    if (status === 3) {
      return { label: tr('自动禁用', 'Auto Disabled'), tone: 'border-danger/20 bg-danger/10 text-danger' };
    }
    if (status === 2) {
      return { label: tr('手动禁用', 'Manual Disabled'), tone: 'border-text-secondary/15 bg-dark-light/40 text-text-secondary' };
    }
    return { label: tr('未知', 'Unknown'), tone: 'border-border/70 bg-dark-light/30 text-text-secondary' };
  };
  const monitoringTrendData = {
    labels: monitoringTrends.length > 0 ? monitoringTrends.map((point) => point.label) : [tr('暂无数据', 'No data')],
    datasets: [
      {
        label: tr('请求数', 'Requests'),
        data: monitoringTrends.length > 0 ? monitoringTrends.map((point) => point.requests) : [0],
        borderColor: '#b4532a',
        backgroundColor: 'rgba(180,83,42,0.1)',
        tension: 0.35,
        fill: true,
      },
      {
        label: tr('错误数', 'Errors'),
        data: monitoringTrends.length > 0 ? monitoringTrends.map((point) => point.error_requests) : [0],
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,0.06)',
        tension: 0.3,
        fill: false,
        borderDash: [6, 4],
      },
    ],
  };
  const visibleFailedLogs = usageLogs.filter((log) => log.status === 'failed').length;
  const visibleSuccessfulLogs = usageLogs.length - visibleFailedLogs;
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(51,65,85,0.3)' }, ticks: { color: '#94a3b8' } }, x: { grid: { display: false }, ticks: { color: '#94a3b8' } } } };
  const selectedTeamIdForLinks = activeTeamId;
  const tabs: { id: DashboardSection; label: string; icon: string; href: string }[] = [
    { id: 'overview', label: tr('概览', 'Overview'), icon: 'fa-chart-pie', href: '/dashboard/overview' },
    { id: 'api-keys', label: tr('API 密钥', 'API Keys'), icon: 'fa-key', href: '/dashboard/api-keys' },
    { id: 'usage', label: tr('用量统计', 'Usage'), icon: 'fa-chart-line', href: '/dashboard/usage' },
    { id: 'billing', label: tr('账单', 'Billing'), icon: 'fa-receipt', href: '/dashboard/billing' },
    { id: 'team', label: tr('团队管理', 'Team'), icon: 'fa-users', href: '/dashboard/team' },
    { id: 'profile', label: tr('个人中心', 'Profile'), icon: 'fa-user', href: '/dashboard/profile' }
  ];
  const apiKeyStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return tr('活跃', 'Active');
      case 'disabled':
        return tr('已禁用', 'Disabled');
      case 'expired':
        return tr('已过期', 'Expired');
      default:
        return tr('已耗尽', 'Exhausted');
    }
  };
  const paymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return tr('已支付', 'Paid');
      case 'pending':
        return tr('待支付', 'Pending');
      default:
        return tr('已关闭', 'Closed');
    }
  };
  const paymentRegionLabel = (region: string) => region === 'domestic' ? tr('国内', 'Domestic') : tr('国际', 'International');
  const checkoutAction = checkoutOrder?.checkout_action || null;

  const dashboardBootstrapping = authLoading || (Boolean(currentUser) && !initialDataReady);
  const activeTab = section;

  if (!authLoading && !isLoggedIn && !currentUser) return null;

  return (
    <>
      <Navbar variant="dashboard" />
      <div className="mx-auto max-w-[1400px] px-3 py-3 sm:px-4 md:px-5 sm:py-6 md:py-8">
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-6">
          <aside className="space-y-3 sm:space-y-4 lg:sticky lg:top-24">
            <div className="grid grid-cols-2 gap-2 pb-2 sm:grid-cols-3 lg:hidden">
                {tabs.map((tab) => (
                  <Link
                    key={tab.id}
                    href={buildDashboardHref(tab.href, selectedTeamIdForLinks)}
                    className={`flex items-center justify-center rounded-full px-2.5 py-1.5 sm:px-3 sm:py-2 font-medium transition-all text-xs sm:text-sm ${
                      activeTab === tab.id ? 'bg-primary text-white' : 'bg-white/60 text-text-secondary hover:text-text-primary hover:bg-white'
                    }`}
                >
                  <i className={`fas ${tab.icon} mr-1 sm:mr-2 text-[0.7rem] sm:text-sm`} />
                  {tab.label}
                </Link>
              ))}
            </div>

            <div className="hidden lg:block editorial-panel p-3 sm:p-4">
              <div className="space-y-1.5 sm:space-y-2">
                {tabs.map((tab) => (
                  <Link
                    key={tab.id}
                    href={buildDashboardHref(tab.href, selectedTeamIdForLinks)}
                    className={`flex w-full items-center gap-2.5 sm:gap-3 rounded-[16px] sm:rounded-[18px] px-3 py-2.5 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-primary text-white shadow-glow'
                        : 'bg-white/60 text-text-secondary hover:bg-white hover:text-text-primary'
                    }`}
                  >
                    <i className={`fas ${tab.icon} w-3.5 sm:w-4 text-center`} />
                    <span>{tab.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            {dashboardBootstrapping || routeRefreshing ? (
              <div className="flex min-h-[48vh] flex-col items-center justify-center rounded-xl sm:rounded-[1.125rem] md:rounded-[1.25rem] border border-border bg-white px-3 py-6 sm:px-4 sm:py-8 md:px-6 md:py-10 text-center text-text-secondary shadow-sm sm:min-h-[60vh]">
                <div className="mb-3 sm:mb-4 inline-flex h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 items-center justify-center rounded-lg sm:rounded-xl md:rounded-2xl bg-primary/10 text-lg sm:text-xl md:text-2xl text-primary animate-pulse shadow-sm">
                  <i className="fas fa-spinner fa-spin" />
                </div>
                <div className="mb-1.5 sm:mb-2 text-sm sm:text-base md:text-lg font-bold tracking-tight text-text-primary">{tr('正在载入...', 'Loading...')}</div>
                <p className="text-[0.7rem] sm:text-xs md:text-sm text-text-secondary">{tr('请稍候，正在获取最新数据', 'Please wait while we fetch the latest data')}</p>
              </div>
            ) : (
              <>
        {activeTab === 'overview' && (
          <>
            <div className="mb-4 sm:mb-6 md:mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:gap-6 lg:grid-cols-4">
              {[
                { label: tr('组织余额', 'Org Balance'), value: formatCurrency(currentBalance), icon: 'fa-wallet', color: 'primary', change: null }, 
                { label: tr('本月请求', 'Monthly Requests'), value: monthlyRequests.toLocaleString(), icon: 'fa-paper-plane', color: 'success', change: usageStats ? tr('当前团队统计', 'Current team totals') : null }, 
                { label: tr('本月消耗', 'Monthly Spend'), value: formatCurrency(currentMonthSpend), icon: 'fa-coins', color: 'warning', change: changePercentage === null ? null : `${changePercentage > 0 ? '+' : ''}${changePercentage}%` }, 
                { label: tr('API 密钥', 'API Keys'), value: String(activeKeys.length), icon: 'fa-key', color: 'secondary', change: null }
              ].map((s) => (
                <div key={s.label} className="rounded-xl sm:rounded-[1.125rem] md:rounded-[1.5rem] border border-border bg-white p-3 sm:p-3.5 md:p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="mb-2 sm:mb-3 md:mb-4 flex items-start justify-between">
                    <span className="pr-2 text-[0.6rem] sm:text-[0.625rem] md:text-[0.65rem] font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary">{s.label}</span>
                    <div className={`flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg sm:rounded-xl text-sm sm:text-base md:text-lg bg-${s.color}/10 text-${s.color}`}>
                      <i className={`fas ${s.icon}`} />
                    </div>
                  </div>
                  <div className="mb-1.5 sm:mb-2 text-[1.5rem] sm:text-[1.75rem] md:text-3xl font-bold tracking-tight text-text-primary">{s.value}</div>
                  {s.change && (
                    <span className={`text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-wider px-1.5 py-0.5 sm:px-2 rounded-md ${
                      s.change.startsWith('+') ? 'bg-danger/10 text-danger' : 
                      s.change.startsWith('-') ? 'bg-success/10 text-success' : 'bg-dark-light/50 text-text-secondary'
                    }`}>
                      {s.change}{s.change.startsWith('+') || s.change.startsWith('-') ? ` ${tr('较上月', 'vs last month')}` : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mb-4 sm:mb-6 md:mb-8 grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-3">
              <div className="rounded-xl sm:rounded-[1.125rem] md:rounded-[2rem] border border-border bg-white p-3 sm:p-4 md:p-8 shadow-sm lg:col-span-2">
                <div className="mb-4 sm:mb-5 md:mb-6 flex flex-col items-start justify-between gap-2 sm:gap-3 md:flex-row md:items-center md:gap-4">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-text-primary">{tr('请求趋势', 'Request Trend')}</h3>
                  <EditorialSelect 
                    className="w-full sm:w-[160px] md:w-[180px] bg-dark-light/10 border-transparent rounded-lg sm:rounded-xl text-xs sm:text-sm" 
                    size="sm" 
                    value={trendRange}
                    onChange={(value) => setTrendRange(value as '7d' | '30d')}
                    options={[{ value: '7d', label: tr('最近 7 天', 'Last 7 Days') }, { value: '30d', label: tr('最近 30 天', 'Last 30 Days') }]} 
                  />
                </div>
                <div className="relative h-[160px] w-full sm:h-[190px] md:h-[250px]">
                  <Line 
                    data={usageChartData} 
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          display: true,
                          position: 'top',
                          labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            color: '#64748b',
                            font: { size: 10, weight: 600 }
                          }
                        }
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 9 } } },
                        y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94a3b8', font: { size: 9 }, padding: 8 } }
                      }
                    }} 
                  />
                </div>
              </div>
              
              <div className="rounded-xl sm:rounded-[1.125rem] md:rounded-[2rem] border border-border bg-white p-3 sm:p-4 md:p-8 shadow-sm">
                <h3 className="mb-4 sm:mb-5 md:mb-6 text-base sm:text-lg md:text-xl font-bold tracking-tight text-text-primary">{tr('模型使用分布', 'Model Distribution')}</h3>
                <div className="relative flex h-[180px] justify-center sm:h-[200px] md:h-[240px]">
                  <Doughnut 
                    data={tokenChartData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false, 
                      cutout: '75%',
                      plugins: { 
                        legend: { position: 'bottom', labels: { color: '#64748b', padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 10, weight: 500 } } } 
                      } 
                    }} 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:gap-6 md:grid-cols-4">
              {[
                { label: tr('总 Token 消耗', 'Total Token Usage'), value: totalTokenUsage.toLocaleString(), icon: 'fa-database' }, 
                { label: tr('平均每次请求 Token', 'Average Tokens per Request'), value: averageTokensPerRequest.toLocaleString(), icon: 'fa-wave-square' }, 
                { label: tr('待处理充值订单', 'Pending Top-up Orders'), value: String(pendingPaymentOrders), icon: 'fa-clock' }, 
                { label: tr('最近账单记录', 'Recent Ledger Entries'), value: String(billingEntries.length), icon: 'fa-receipt' }
              ].map((s) => (
                <div key={s.label} className="group rounded-xl sm:rounded-[1.125rem] md:rounded-[1.5rem] border border-border bg-white p-3 sm:p-3.5 md:p-6 text-center shadow-sm transition-shadow hover:shadow-md">
                  <div className="mx-auto mb-2 sm:mb-3 md:mb-4 flex h-8 w-8 sm:h-9 sm:w-9 md:h-12 md:w-12 items-center justify-center rounded-lg sm:rounded-xl md:rounded-2xl bg-primary/5 text-sm sm:text-base md:text-xl text-primary transition-all group-hover:scale-110 group-hover:bg-primary/10">
                    <i className={`fas ${s.icon}`} />
                  </div>
                  <div className="mb-0.5 sm:mb-1 text-base sm:text-lg md:text-2xl font-bold tracking-tight text-text-primary">{s.value}</div>
                  <div className="text-[0.6rem] sm:text-[0.625rem] md:text-[0.65rem] font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary">{s.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'api-keys' && (
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:gap-6 lg:grid-cols-4">
              <div className="group rounded-xl sm:rounded-[1.125rem] md:rounded-[1.5rem] border border-border bg-white p-3 sm:p-3.5 md:p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-primary/10 text-base sm:text-lg md:text-xl text-primary transition-transform group-hover:scale-110"><i className="fas fa-key" /></div>
                  <div><div className="mb-0.5 sm:mb-1 text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{tr('总密钥数', 'Total Keys')}</div><div className="text-[1.5rem] sm:text-[1.75rem] md:text-[1.75rem] font-bold tracking-tight text-text-primary">{apiKeys.length}</div></div>
                </div>
              </div>
              <div className="group rounded-xl sm:rounded-[1.125rem] md:rounded-[1.5rem] border border-border bg-white p-3 sm:p-3.5 md:p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-success/10 text-base sm:text-lg md:text-xl text-success transition-transform group-hover:scale-110"><i className="fas fa-check-circle" /></div>
                  <div><div className="mb-0.5 sm:mb-1 text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{tr('活跃密钥', 'Active Keys')}</div><div className="text-[1.5rem] sm:text-[1.75rem] md:text-[1.75rem] font-bold tracking-tight text-text-primary">{activeKeys.length}</div></div>
                </div>
              </div>
              <div className="group rounded-xl sm:rounded-[1.125rem] md:rounded-[1.5rem] border border-border bg-white p-3 sm:p-3.5 md:p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-warning/10 text-base sm:text-lg md:text-xl text-warning transition-transform group-hover:scale-110"><i className="fas fa-paper-plane" /></div>
                  <div><div className="mb-0.5 sm:mb-1 text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{tr('本月请求', 'Monthly Requests')}</div><div className="text-[1.5rem] sm:text-[1.75rem] md:text-[1.75rem] font-bold tracking-tight text-text-primary">{monthlyRequests.toLocaleString()}</div></div>
                </div>
              </div>
              <div className="group rounded-xl sm:rounded-[1.125rem] md:rounded-[1.5rem] border border-border bg-white p-3 sm:p-3.5 md:p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-secondary/10 text-base sm:text-lg md:text-xl text-secondary transition-transform group-hover:scale-110"><i className="fas fa-database" /></div>
                  <div><div className="mb-0.5 sm:mb-1 text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{tr('Token 消耗', 'Token Usage')}</div><div className="text-[1.5rem] sm:text-[1.75rem] md:text-[1.75rem] font-bold tracking-tight text-text-primary">{totalTokenUsage.toLocaleString()}</div></div>
                </div>
              </div>
            </div>

            {/* 密钥列表 */}
            <div className="rounded-xl sm:rounded-[1.125rem] md:rounded-[2rem] border border-border bg-white p-3 sm:p-4 md:p-8 shadow-sm">
              <div className="mb-4 sm:mb-6 md:mb-8 flex flex-col items-start justify-between gap-3 sm:gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="mb-1.5 sm:mb-2 text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-text-primary">{tr('API 密钥管理', 'API Key Management')}</h3>
                  <p className="text-[0.7rem] sm:text-xs md:text-sm leading-relaxed text-text-secondary">{tr('创建和管理您的 API 密钥，用于调用模型接口', 'Create and manage the API keys used to access model endpoints')}</p>
                </div>
                <button className="btn-primary w-full sm:w-auto justify-center rounded-full shadow-sm hover:shadow hover:-translate-y-0.5 transition-all px-4 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm" onClick={openCreateKeyModal}>
                  <i className="fas fa-plus mr-1.5 sm:mr-2" /> {tr('创建密钥', 'Create Key')}
                </button>
              </div>
              
              {apiKeys.length === 0 ? (
                <div className="rounded-xl sm:rounded-[1.125rem] md:rounded-[1.5rem] border border-dashed border-border/60 bg-dark-light/10 py-10 sm:py-12 md:py-24 text-center text-text-secondary">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-sm">
                    <i className="fas fa-key text-2xl sm:text-3xl text-text-secondary/40" />
                  </div>
                  <p className="mb-4 sm:mb-6 text-base sm:text-lg text-text-primary font-medium">{tr('还没有 API 密钥', 'No API keys yet')}</p>
                  <button className="btn-primary rounded-full shadow-sm hover:-translate-y-0.5 transition-all text-xs sm:text-sm px-5 py-2 sm:px-6 sm:py-2.5" onClick={openCreateKeyModal}>{tr('创建第一个密钥', 'Create your first key')}</button>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {apiKeys.map((key) => {
                    const isCopyingFullKey = copyingFullKeyId === key.id;

                    return (
                    <div key={key.id} className="rounded-xl sm:rounded-[1.125rem] md:rounded-[1.5rem] border border-border/80 bg-white p-3 sm:p-4 md:p-8 transition-all duration-300 hover:border-primary/20 hover:shadow-md">
                      {/* 头部：名称和状态 */}
                      <div className="mb-6 flex flex-col items-start justify-between gap-5 lg:flex-row">
                        <div className="flex items-start gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-base sm:h-12 sm:w-12 sm:rounded-2xl sm:text-lg ${key.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                            <i className="fas fa-key" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 flex-wrap mb-1.5">
                              <span className="text-base font-bold tracking-tight text-text-primary sm:text-lg">{key.name}</span>
                              <span className={`px-2.5 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider ${key.status === 'active' ? 'bg-success/10 text-success' : key.status === 'disabled' ? 'bg-danger/10 text-danger' : key.status === 'expired' ? 'bg-warning/10 text-warning' : 'bg-dark-light/50 text-text-secondary'}`}>
                                {apiKeyStatusLabel(key.status)}
                              </span>
                            </div>
                            <div className="text-text-secondary text-xs">
                              {tr('创建于', 'Created')} {formatDate(key.created_at)} {key.expires_at && <span className="ml-2 pl-2 border-l border-border/60">{tr('过期时间', 'Expires')} {formatDate(key.expires_at)}</span>}
                            </div>
                            {key.remark && (
                              <div className="mt-3 rounded-lg border border-border/50 bg-dark-light/30 px-3 py-2 text-xs leading-relaxed text-text-secondary sm:rounded-xl sm:text-sm">
                                {key.remark}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap">
                          <button 
                            onClick={() => { handleCopyFullKey(key.id); }} 
                            disabled={isCopyingFullKey}
                            className="btn-secondary justify-center rounded-full bg-white px-4 py-2 text-xs shadow-sm transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none"
                            title={tr('复制密钥', 'Copy key')}
                          >
                            <i className={`fas ${isCopyingFullKey ? 'fa-spinner fa-spin' : 'fa-copy'} mr-1.5`} />
                            {tr('复制', 'Copy')}
                          </button>
                          <button 
                            onClick={() => handleEditKey(key)} 
                            className="btn-secondary justify-center rounded-full bg-white px-4 py-2 text-xs shadow-sm transition-colors hover:border-primary/30 hover:text-primary sm:flex-none"
                            title={tr('编辑', 'Edit')}
                          >
                            <i className="fas fa-edit mr-1.5" />
                            {tr('编辑', 'Edit')}
                          </button>
                          <button 
                            onClick={() => handleToggleKeyStatus(key)} 
                            className={`btn-secondary justify-center rounded-full bg-white px-4 py-2 text-xs shadow-sm transition-colors sm:flex-none ${key.status === 'active' ? 'hover:border-warning hover:text-warning hover:bg-warning/5' : 'hover:border-success hover:text-success hover:bg-success/5'}`}
                            title={key.status === 'active' ? tr('禁用', 'Disable') : tr('启用', 'Enable')}
                          >
                            <i className={`fas ${key.status === 'active' ? 'fa-ban' : 'fa-check'} mr-1.5`} />
                            {key.status === 'active' ? tr('禁用', 'Disable') : tr('启用', 'Enable')}
                          </button>
                          <button 
                            onClick={() => handleDeleteKey(key.id, key.name)} 
                            className="btn-secondary justify-center rounded-full bg-white px-4 py-2 text-xs shadow-sm transition-colors hover:border-danger hover:text-danger hover:bg-danger/5 sm:flex-none"
                            title={tr('删除', 'Delete')}
                          >
                            <i className="fas fa-trash mr-1.5" />
                            {tr('删除', 'Delete')}
                          </button>
                        </div>
                      </div>

                      {/* 密钥值 */}
                      <div className="mb-5 rounded-[0.875rem] border border-border/50 bg-dark-light/10 p-3 shadow-inner sm:mb-6 sm:rounded-[1rem] sm:p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <code className="font-mono text-text-primary text-xs font-semibold tracking-wider break-all sm:text-sm">{key.key.substring(0, 20)}...{key.key.slice(-8)}</code>
                          <button 
                            onClick={() => { handleCopyFullKey(key.id); }}
                            disabled={isCopyingFullKey}
                            className="inline-flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-70 bg-primary/10 px-3 py-1.5 rounded-lg"
                          >
                            {isCopyingFullKey && <i className="fas fa-spinner fa-spin" />}
                            <span>{isCopyingFullKey ? tr('获取中...', 'Loading...') : tr('复制完整', 'Copy Full')}</span>
                          </button>
                        </div>
                      </div>

                      {/* 使用统计 */}
                      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                        <div className="rounded-[0.875rem] border border-border/60 bg-white p-3 text-center shadow-sm sm:rounded-[1rem] sm:p-4">
                          <div className="mb-1 text-base font-bold tracking-tight text-primary sm:text-xl">{formatCurrency(key.spent_amount || key.used_quota)}</div>
                          <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-text-secondary">{tr('已用额度', 'Used Quota')}</div>
                        </div>
                        <div className="rounded-[0.875rem] border border-border/60 bg-white p-3 text-center shadow-sm sm:rounded-[1rem] sm:p-4">
                          <div className="mb-1 text-base font-bold tracking-tight text-success sm:text-xl">{key.unlimited_quota ? '∞' : key.quota.toLocaleString()}</div>
                          <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-text-secondary">{tr('总额度', 'Total Quota')}</div>
                        </div>
                        <div className="rounded-[0.875rem] border border-border/60 bg-white p-3 text-center shadow-sm sm:rounded-[1rem] sm:p-4">
                          <div className="mb-1 text-base font-bold tracking-tight text-warning sm:text-xl">{key.unlimited_quota ? '∞' : (key.quota - key.used_quota).toLocaleString()}</div>
                          <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-text-secondary">{tr('剩余额度', 'Remaining')}</div>
                        </div>
                        <div className="rounded-[0.875rem] border border-border/60 bg-white p-3 text-center shadow-sm sm:rounded-[1rem] sm:p-4">
                          <div className="mb-1 text-base font-bold tracking-tight text-secondary sm:text-xl">{key.models.length > 0 ? key.models.length : tr('全部', 'All')}</div>
                          <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-text-secondary">{tr('可用模型', 'Available Models')}</div>
                        </div>
                      </div>

                      {/* 权限标签 */}
                      <div className="flex flex-wrap gap-2.5">
                        <span className="px-3 py-1.5 bg-primary/5 text-primary border border-primary/20 rounded-lg text-xs font-medium">
                          <i className="fas fa-cube mr-1.5 opacity-70" />{key.models.length > 0 ? (isZh ? `${key.models.length} 个模型` : `${key.models.length} models`) : tr('全部模型', 'All models')}
                        </span>
                        <span className="px-3 py-1.5 bg-secondary/5 text-secondary border border-secondary/20 rounded-lg text-xs font-medium">
                          <i className="fas fa-shield-halved mr-1.5 opacity-70" />
                          {key.permission_scopes.length > 0
                            ? (isZh ? `${key.permission_scopes.length} 项权限` : `${key.permission_scopes.length} scopes`)
                            : tr('默认权限范围', 'Default scopes')}
                        </span>
                        <span className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${key.subnet ? 'bg-warning/5 text-warning border-warning/20' : 'bg-dark-light/20 text-text-secondary border-border/50'}`}>
                          <i className="fas fa-network-wired mr-1.5 opacity-70" />
                          {key.subnet ? tr('已绑定 IP 白名单', 'IP allowlist enabled') : tr('未限制 IP', 'No IP allowlist')}
                        </span>
                        <span className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${key.unlimited_quota ? 'bg-success/5 text-success border-success/20' : 'bg-warning/5 text-warning border-warning/20'}`}>
                          <i className={`fas ${key.unlimited_quota ? 'fa-infinity' : 'fa-coins'} mr-1.5 opacity-70`} />{key.unlimited_quota ? tr('无限额度', 'Unlimited quota') : (isZh ? `${key.quota} 额度` : `${key.quota} quota`)}
                        </span>
                        <span className="px-3 py-1.5 bg-dark-light/20 text-text-secondary border border-border/50 rounded-lg text-xs font-medium">
                          <i className="fas fa-paper-plane mr-1.5 opacity-70" />
                          {isZh ? `${key.request_count} 次请求` : `${key.request_count} requests`}
                        </span>
                        <span className="px-3 py-1.5 bg-dark-light/20 text-text-secondary border border-border/50 rounded-lg text-xs font-medium">
                          <i className="fas fa-database mr-1.5 opacity-70" />
                          {isZh ? `${key.total_tokens.toLocaleString()} Token` : `${key.total_tokens.toLocaleString()} tokens`}
                        </span>
                        <span className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${key.expires_at ? 'bg-warning/5 text-warning border-warning/20' : 'bg-dark-light/20 text-text-secondary border-border/50'}`}>
                          <i className="fas fa-clock mr-1.5 opacity-70" />{key.expires_at ? (isZh ? `${formatDate(key.expires_at)} 过期` : `Expires ${formatDate(key.expires_at)}`) : tr('永不过期', 'Never expires')}
                        </span>
                        {key.last_full_key_viewed_at && (
                          <span className="px-3 py-1.5 bg-dark-light/20 text-text-secondary border border-border/50 rounded-lg text-xs font-medium">
                            <i className="fas fa-eye mr-1.5 opacity-70" />
                            {tr('最近查看', 'Last revealed')} {formatDate(key.last_full_key_viewed_at)}
                          </span>
                        )}
                      </div>
                      {key.permission_scopes.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/40 flex flex-wrap gap-2">
                          <span className="text-xs text-text-secondary mr-1 self-center">{tr('具体权限:', 'Scopes:')}</span>
                          {key.permission_scopes.map((scope) => {
                            const scopeOption = apiKeyPermissionScopeOptions.find((item) => item.value === scope);
                            return (
                              <span key={scope} className="px-2.5 py-1 bg-white shadow-sm text-text-primary rounded-md text-xs border border-border/60 font-medium">
                                {scopeOption?.label || scope}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 使用说明 */}
            <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-3 sm:p-4 md:p-8 shadow-sm">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-text-primary mb-5 sm:mb-6 md:mb-8">{tr('API 密钥使用说明', 'API Key Guide')}</h3>
              <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg sm:text-xl flex-shrink-0 shadow-inner">1</div>
                    <div>
                      <div className="font-bold text-text-primary mb-0.5 sm:mb-1 tracking-tight text-sm sm:text-base">{tr('创建 API Key', 'Create an API key')}</div>
                      <div className="text-text-secondary text-xs sm:text-sm leading-relaxed">{tr('自动生成唯一密钥，作为开发者接入 API 的核心入口', 'Generate a unique key that serves as the main entry point for API access')}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg sm:text-xl flex-shrink-0 shadow-inner">2</div>
                    <div>
                      <div className="font-bold text-text-primary mb-0.5 sm:mb-1 tracking-tight text-sm sm:text-base">{tr('撤销/禁用 Key', 'Revoke or disable keys')}</div>
                      <div className="text-text-secondary text-xs sm:text-sm leading-relaxed">{tr('用户可手动停用或设置过期时间，控制安全访问，防止泄露', 'Disable keys manually or set expiration dates to control access and reduce leakage risk')}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg sm:text-xl flex-shrink-0 shadow-inner">3</div>
                    <div>
                      <div className="font-bold text-text-primary mb-0.5 sm:mb-1 tracking-tight text-sm sm:text-base">{tr('使用统计', 'Usage analytics')}</div>
                      <div className="text-text-secondary text-xs sm:text-sm leading-relaxed">{tr('查看请求次数、调用量，了解 Key 使用情况，成本透明', 'Review requests and token usage to understand cost and activity per key')}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-lg sm:text-xl font-bold flex-shrink-0">4</div>
                    <div>
                      <div className="font-bold text-text-primary mb-0.5 sm:mb-1 tracking-tight text-sm sm:text-base">{tr('权限绑定', 'Permission binding')}</div>
                      <div className="text-text-secondary text-xs sm:text-sm leading-relaxed">{tr('通过模型范围、IP 白名单和权限范围约束使用边界，并完整记录审计行为', 'Constrain usage by model range, IP allowlists, and permission scopes with a full audit trail')}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-lg sm:text-xl font-bold flex-shrink-0">5</div>
                    <div>
                      <div className="font-bold text-text-primary mb-0.5 sm:mb-1 tracking-tight text-sm sm:text-base">{tr('Key 命名与管理', 'Naming and organization')}</div>
                      <div className="text-text-secondary text-xs sm:text-sm leading-relaxed">{tr('给每个 Key 起别名、备注，提高管理效率，方便多 Key 场景', 'Use aliases and notes to organize keys more efficiently across multiple environments')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            <div className="bg-white border border-border rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] p-3 sm:p-4 md:p-6 lg:p-8 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 md:mb-6">
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold tracking-tight text-text-primary">{tr('实时监控', 'Live Metrics')}</h3>
                {usageSyncing && (
                  <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-border/70 bg-primary/5 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[0.6rem] sm:text-[0.65rem] font-medium text-text-secondary">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    {tr('正在同步最新用量…', 'Syncing latest usage...')}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5 sm:gap-3 md:gap-4">{[
                { label: tr('请求数', 'Requests'), value: (usageStats?.request_count ?? usageLogs.length).toLocaleString(), unit: tr('当前可见日志', 'Visible logs'), tone: 'primary' },
                { label: tr('输入 Token', 'Input Tokens'), value: totalPromptTokens.toLocaleString(), unit: tr('当前可见日志', 'Visible logs'), tone: 'amber' },
                { label: tr('输出 Token', 'Output Tokens'), value: totalCompletionTokens.toLocaleString(), unit: tr('当前可见日志', 'Visible logs'), tone: 'emerald' },
                { label: tr('平均每次请求 Token', 'Avg Tokens / Request'), value: averageTokensPerRequest.toLocaleString(), unit: tr('密度', 'Density'), tone: 'slate' },
                { label: tr('涉及模型数', 'Models Touched'), value: uniqueModelsUsed.toLocaleString(), unit: tr('当前视图', 'Current view'), tone: 'rose' },
              ].map((m) => (
                <div
                  key={m.label}
                  className="group relative overflow-hidden rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,246,241,0.94))] p-3 sm:p-4 md:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={`absolute inset-x-0 top-0 h-0.5 sm:h-1 ${
                    m.tone === 'amber'
                      ? 'bg-warning/70'
                      : m.tone === 'emerald'
                        ? 'bg-success/70'
                        : m.tone === 'rose'
                          ? 'bg-danger/55'
                          : m.tone === 'slate'
                            ? 'bg-text-secondary/35'
                            : 'bg-primary/70'
                  }`} />
                  <div className="text-[0.58rem] sm:text-[0.62rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">
                    {m.label}
                  </div>
                  <div className="mt-2 sm:mt-3 text-xl sm:text-2xl md:text-[2rem] font-bold tracking-tight text-text-primary">
                    {m.value}
                  </div>
                  <div className="mt-1.5 sm:mt-2 text-[0.62rem] sm:text-[0.68rem] uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary/70">
                    {m.unit}
                  </div>
                </div>
              ))}</div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.85fr)]">
              <div className="space-y-3 sm:space-y-4 md:space-y-6">
                <div className="bg-white border border-border rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] p-3 sm:p-4 md:p-6 lg:p-8 shadow-sm">
                  <div className="mb-4 sm:mb-5 md:mb-6 flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold tracking-tight text-text-primary">{tr('运行时监控', 'Runtime Monitoring')}</h3>
                      <p className="mt-1 sm:mt-1.5 max-w-3xl text-[0.7rem] sm:text-xs leading-relaxed text-text-secondary">
                        {tr('这里集中展示当前平台的请求成功率、延迟、吞吐和渠道状态，方便你快速判断整体运行是否稳定。', 'This section summarizes platform success rate, latency, throughput, and channel health so you can quickly judge whether runtime behavior is stable.')}
                      </p>
                    </div>
                    <div className="inline-flex items-center rounded-full border border-border/70 bg-dark-light/10 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[0.6rem] sm:text-[0.65rem] font-semibold text-text-secondary whitespace-nowrap">
                      <i className="fas fa-clock mr-1 sm:mr-1.5 opacity-70" />
                      {monitoring?.refreshed_at ? formatDate(monitoring.refreshed_at) : tr('暂未刷新', 'Not refreshed yet')}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4 sm:gap-2.5 md:gap-3">
                    {[
                      {
                        label: tr('24 小时请求', '24h Requests'),
                        value: monitoringSummary?.total_requests_24h?.toLocaleString() || '--',
                        meta: tr('成功 {{success}} / 失败 {{error}}', 'Success {{success}} / Failed {{error}}')
                          .replace('{{success}}', String(monitoringSummary?.successful_requests_24h ?? 0))
                          .replace('{{error}}', String(monitoringSummary?.error_requests_24h ?? 0)),
                        tone: 'primary',
                      },
                      {
                        label: tr('24 小时成功率', '24h Success Rate'),
                        value: formatMonitoringPercent(monitoringSummary?.success_rate_24h),
                        meta: tr('当前告警 {{count}} 条', '{{count}} active alerts')
                          .replace('{{count}}', String(monitoringSummary?.alert_count ?? 0)),
                        tone: 'emerald',
                      },
                      {
                        label: tr('平均 / P95 延迟', 'Avg / P95 Latency'),
                        value: typeof monitoringSummary?.avg_latency_ms_24h === 'number'
                          ? `${Math.round(monitoringSummary.avg_latency_ms_24h)} / ${Math.round(monitoringSummary.p95_latency_ms_24h || 0)} ms`
                          : '--',
                        meta: tr('样本 {{count}} 条', '{{count}} samples')
                          .replace('{{count}}', String(monitoringSummary?.latency_sample_size_24h ?? 0)),
                        tone: 'amber',
                      },
                      {
                        label: tr('最近一分钟吞吐', 'Last Min Throughput'),
                        value: typeof monitoringSummary?.last_minute_rpm === 'number'
                          ? `${monitoringSummary.last_minute_rpm} RPM`
                          : '--',
                        meta: typeof monitoringSummary?.last_minute_tpm === 'number'
                          ? `${monitoringSummary.last_minute_tpm.toLocaleString()} TPM`
                          : tr('暂无数据', 'No data'),
                        tone: 'rose',
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg sm:rounded-xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,246,241,0.94))] p-2.5 sm:p-3 md:p-4 shadow-sm">
                        <div className="text-[0.55rem] sm:text-[0.58rem] font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary">
                          {item.label}
                        </div>
                        <div className={`mt-1.5 sm:mt-2 text-base sm:text-lg md:text-xl font-bold tracking-tight ${
                          item.tone === 'emerald'
                            ? 'text-success'
                            : item.tone === 'amber'
                              ? 'text-warning'
                              : item.tone === 'rose'
                                ? 'text-danger'
                                : 'text-text-primary'
                        }`}>
                          {item.value}
                        </div>
                        <div className="mt-1 sm:mt-1.5 text-[0.62rem] sm:text-[0.68rem] leading-4 sm:leading-5 text-text-secondary">
                          {item.meta}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 sm:mt-4 md:mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.6fr)]">
                    <div className="rounded-lg sm:rounded-xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,239,0.94))] p-3 sm:p-4">
                      <div className="mb-2.5 sm:mb-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[0.58rem] sm:text-[0.62rem] font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary">
                            {tr('24 小时趋势', '24h Trend')}
                          </div>
                          <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-semibold text-text-primary">
                            {tr('请求压力与错误波动', 'Request pressure and error spikes')}
                          </div>
                        </div>
                      </div>
                      <div className="relative h-[180px] sm:h-[210px]">
                        <Line
                          data={monitoringTrendData}
                          options={{
                            ...chartOptions,
                            plugins: {
                              ...chartOptions.plugins,
                              legend: {
                                display: true,
                                position: 'top',
                                labels: {
                                  usePointStyle: true,
                                  pointStyle: 'circle',
                                  color: '#64748b',
                                  font: { size: 9, weight: 600 },
                                },
                              },
                            },
                            scales: {
                              x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 8 } } },
                              y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94a3b8', font: { size: 8 }, padding: 6 }, beginAtZero: true },
                            },
                          }}
                        />
                      </div>
                    </div>
                    <div className="rounded-lg sm:rounded-xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,239,0.94))] p-3 sm:p-4">
                      <div className="text-[0.58rem] sm:text-[0.62rem] font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary">
                        {tr('渠道压力概览', 'Channel Pressure')}
                      </div>
                      <div className="mt-2.5 sm:mt-3 space-y-2">
                        {[
                          { label: tr('在线渠道', 'Enabled'), value: monitoringSummary?.enabled_channels ?? 0, tone: 'text-success bg-success/10 border-success/20' },
                          { label: tr('自动禁用', 'Auto Disabled'), value: monitoringSummary?.auto_disabled_channels ?? 0, tone: 'text-danger bg-danger/10 border-danger/20' },
                          { label: tr('手动禁用', 'Manual Disabled'), value: monitoringSummary?.manually_disabled_channels ?? 0, tone: 'text-text-secondary bg-dark-light/30 border-border/60' },
                          { label: tr('慢渠道', 'Slow'), value: monitoringSummary?.slow_channels ?? 0, tone: 'text-warning bg-warning/10 border-warning/20' },
                        ].map((item) => (
                          <div key={item.label} className={`flex items-center justify-between rounded-md sm:rounded-lg border px-2.5 py-2 sm:px-3 sm:py-2.5 ${item.tone}`}>
                            <span className="text-[0.7rem] sm:text-xs font-medium">{item.label}</span>
                            <span className="text-sm sm:text-base font-bold tracking-tight">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-border rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] p-3 sm:p-4 md:p-6 lg:p-8 shadow-sm">
                  <div className="mb-3 sm:mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold tracking-tight text-text-primary">{tr('渠道状态', 'Channel Health')}</h3>
                      <p className="mt-1 sm:mt-1.5 text-[0.7rem] sm:text-xs leading-relaxed text-text-secondary">
                        {tr('这里会显示各渠道的可用性、成功率和响应速度，便于定位异常渠道并观察整体健康度。', 'This list shows channel availability, success rate, and response speed so you can spot unstable channels and review overall health.')}
                      </p>
                    </div>
                    <div className="rounded-full border border-border/70 bg-dark-light/10 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[0.6rem] sm:text-[0.65rem] font-semibold text-text-secondary whitespace-nowrap">
                      {monitoringChannels.length} {tr('条', 'ch')}
                    </div>
                  </div>
                  {monitoringChannels.length === 0 ? (
                    <div className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-dashed border-border/70 bg-dark-light/5 px-4 py-10 text-center text-xs sm:text-sm text-text-secondary">
                      {tr('当前没有可展示的渠道健康数据', 'No channel health data is available yet')}
                    </div>
                  ) : (
                    <div className="space-y-2.5 sm:space-y-3">
                      {monitoringChannels.map((channel) => {
                        const statusMeta = getChannelStatusMeta(channel.status);
                        return (
                          <div key={channel.channel_id} className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,246,241,0.94))] px-3 py-3 sm:px-4 sm:py-4 shadow-sm">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm sm:text-base font-bold tracking-tight text-text-primary">{channel.name}</span>
                                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.62rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.14em] ${statusMeta.tone}`}>
                                    {statusMeta.label}
                                  </span>
                                  <span className="inline-flex items-center rounded-full border border-border/60 bg-white/80 px-2.5 py-1 text-[0.62rem] sm:text-[0.65rem] font-semibold text-text-secondary">
                                    {channel.group || 'default'}
                                  </span>
                                </div>
                                <div className="mt-1.5 text-[0.7rem] sm:text-xs leading-5 text-text-secondary">
                                  ID #{channel.channel_id} · {tr('模型', 'Models')}: {channel.models || tr('未标注', 'Unknown')}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[420px]">
                                {[
                                  { label: tr('成功率', 'Success Rate'), value: formatMonitoringPercent(channel.success_rate_24h) },
                                  { label: tr('24h 平均延迟', '24h Avg Latency'), value: `${Math.round(channel.avg_latency_ms_24h || 0)} ms` },
                                  { label: tr('24h P95', '24h P95'), value: `${Math.round(channel.p95_latency_ms_24h || 0)} ms` },
                                  { label: tr('当前响应', 'Current Response'), value: `${Math.round(channel.response_time || 0)} ms` },
                                ].map((item) => (
                                  <div key={item.label} className="rounded-md sm:rounded-lg border border-border/60 bg-white/85 px-2.5 py-2 text-center">
                                    <div className="text-[0.55rem] sm:text-[0.58rem] font-bold uppercase tracking-[0.14em] text-text-secondary">{item.label}</div>
                                    <div className="mt-1 text-xs sm:text-sm font-bold tracking-tight text-text-primary">{item.value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white border border-border rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] p-3 sm:p-4 md:p-6 lg:p-8 shadow-sm">
                <div className="mb-4 sm:mb-5 md:mb-6 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold tracking-tight text-text-primary">{tr('运行提醒', 'Runtime Alerts')}</h3>
                    <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-relaxed text-text-secondary">
                      {tr('当请求成功率、延迟或渠道状态出现异常时，会在这里给出提醒，方便你及时排查。', 'This area highlights issues in success rate, latency, or channel status so you can respond before they affect more traffic.')}
                    </p>
                  </div>
                  <div className="rounded-full border border-border/70 bg-dark-light/10 px-3 py-1.5 text-[0.65rem] sm:text-xs font-semibold text-text-secondary">
                    {monitoringAlerts.length} {tr('条告警', 'alerts')}
                  </div>
                </div>
                {monitoringAlerts.length === 0 ? (
                  <div className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-dashed border-border/70 bg-dark-light/5 px-4 py-12 text-center text-xs sm:text-sm text-text-secondary">
                    {tr('当前没有需要处理的告警', 'There are no active alerts to handle right now')}
                  </div>
                ) : (
                  <div className="space-y-2.5 sm:space-y-3">
                    {monitoringAlerts.map((alert) => (
                      <div key={alert.id} className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,246,241,0.94))] p-3 sm:p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm sm:text-base font-bold tracking-tight text-text-primary">{alert.title}</div>
                            <div className="mt-1.5 text-xs sm:text-sm leading-6 text-text-secondary">{alert.detail}</div>
                          </div>
                          <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[0.62rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.14em] ${getMonitoringAlertTone(alert.level)}`}>
                            {alert.level}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.68rem] sm:text-[0.72rem] text-text-secondary">
                          <span>{typeof alert.occurred_at === 'number' ? formatDate(new Date(alert.occurred_at * 1000).toISOString()) : '-'}</span>
                          <span>{alert.type}</span>
                          {typeof alert.entity_id === 'number' ? <span>ID #{alert.entity_id}</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white border border-border rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] p-3 sm:p-4 md:p-6 lg:p-8 shadow-sm">
              <div className="mb-4 sm:mb-5 flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold tracking-tight text-text-primary">{tr('请求日志', 'Request Logs')}</h3>
                  <p className="mt-1.5 sm:mt-2 max-w-3xl text-xs sm:text-sm leading-relaxed text-text-secondary">
                    {tr('这里展示的是团队运行时请求日志，不只是账本金额。重点先看状态、耗时和详情入口，再决定是否需要继续排查渠道或 Provider。', 'This area shows runtime request logs rather than only billing rows. Start with status, latency, and the detail entry before digging deeper into channel or provider issues.')}
                  </p>
                </div>
                <div className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-border/70 bg-[linear-gradient(180deg,rgba(252,249,244,0.96),rgba(255,255,255,0.98))] p-2 sm:p-2.5 shadow-sm sm:min-w-[316px]">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md sm:rounded-lg border border-success/20 bg-success/5 px-2.5 py-2 sm:px-3 sm:py-2.5">
                        <div className="text-[0.55rem] sm:text-[0.58rem] font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary">{tr('成功', 'Success')}</div>
                        <div className="mt-0.5 sm:mt-1 text-base sm:text-lg font-bold tracking-tight text-success">{visibleSuccessfulLogs}</div>
                      </div>
                      <div className="rounded-md sm:rounded-lg border border-danger/20 bg-danger/5 px-2.5 py-2 sm:px-3 sm:py-2.5">
                        <div className="text-[0.55rem] sm:text-[0.58rem] font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary">{tr('失败', 'Failed')}</div>
                        <div className="mt-0.5 sm:mt-1 text-base sm:text-lg font-bold tracking-tight text-danger">{visibleFailedLogs}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="inline-flex flex-1 sm:flex-initial sm:min-w-[108px] items-center justify-center rounded-full border border-border bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-[0.7rem] sm:text-xs font-semibold text-text-primary shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
                        onClick={() => void handleExportUsageLogs('csv')}
                      >
                        <i className="fas fa-file-csv mr-1.5 sm:mr-2 opacity-70" />CSV
                      </button>
                      <button
                        className="inline-flex flex-1 sm:flex-initial sm:min-w-[108px] items-center justify-center rounded-full border border-border bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-[0.7rem] sm:text-xs font-semibold text-text-primary shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
                        onClick={() => void handleExportUsageLogs('pdf')}
                      >
                        <i className="fas fa-file-pdf mr-1.5 sm:mr-2 opacity-70" />PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {usageLogs.length === 0 ? (
                <div className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-dashed border-border/70 bg-dark-light/5 px-4 py-10 sm:px-6 sm:py-14 text-center text-xs sm:text-sm text-text-secondary">
                  {tr('暂无记录', 'No records')}
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  {usageLogs.map((log, i) => {
                    const summary = getUsageLogSummary(log);
                    return (
                    <div
                      key={i}
                      className={`group overflow-hidden rounded-lg sm:rounded-xl md:rounded-[1.125rem] border px-3 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-4 sm:py-4 md:px-5 md:py-5 ${
                        log.status === 'failed'
                          ? 'border-danger/20 bg-[linear-gradient(180deg,rgba(255,251,250,0.98),rgba(255,245,243,0.94))]'
                          : 'border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,246,241,0.94))]'
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-text-primary">
                                  {log.model}
                                </span>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] ${
                                    log.status === 'failed'
                                      ? 'bg-danger/10 text-danger'
                                      : 'bg-success/10 text-success'
                                  }`}
                                >
                                  {log.status === 'failed' ? tr('失败', 'Failed') : tr('成功', 'Success')}
                                </span>
                                {typeof log.runtime_use_time === 'number' ? (
                                  <span className="inline-flex items-center rounded-full border border-border/60 bg-white/80 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[0.6rem] sm:text-[0.65rem] font-semibold text-text-secondary">
                                    <i className="fas fa-stopwatch mr-1 sm:mr-1.5 opacity-70" />
                                    {log.runtime_use_time} ms
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:gap-x-4 sm:gap-y-2 text-[0.68rem] sm:text-[0.72rem] md:text-xs text-text-secondary">
                                <span>{formatDate(log.created_at)}</span>
                                <span>{tr('API 密钥', 'API Key')}: {log.api_key_name}</span>
                                <span>{tr('渠道', 'Channel')} #{log.runtime_channel_id ?? '-'}</span>
                                <span className="font-mono">{tr('请求 ID', 'Request ID')}: {log.runtime_request_id || '-'}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-border/60 bg-white/70 p-1.5 sm:p-2 sm:min-w-[260px]">
                              {[
                                { label: 'Input', value: log.prompt_tokens?.toLocaleString() || '0' },
                                { label: 'Output', value: log.completion_tokens?.toLocaleString() || '0' },
                                { label: tr('费用', 'Cost'), value: formatCurrency(log.quota_cost) },
                              ].map((item) => (
                                <div key={item.label} className="rounded-md sm:rounded-lg bg-white px-2 py-1.5 sm:px-3 sm:py-2 text-center">
                                  <div className="text-[0.58rem] sm:text-[0.62rem] font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary">
                                    {item.label}
                                  </div>
                                  <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold tracking-tight text-text-primary">
                                    {item.value}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {summary ? (
                            <div className="mt-3 sm:mt-4 rounded-md sm:rounded-lg md:rounded-xl border border-border/60 bg-white/85 px-3 py-2 sm:px-4 sm:py-3">
                              <div className="text-[0.58rem] sm:text-[0.62rem] font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-secondary">
                                {tr('摘要', 'Summary')}
                              </div>
                              <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-6 sm:leading-7 text-text-secondary">
                                {summary}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center xl:pl-4">
                          <button
                            type="button"
                            onClick={() => void openUsageLogDetail(log)}
                            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-border bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-text-primary transition-colors hover:border-primary/30 hover:text-primary"
                          >
                            <i className="fas fa-file-lines mr-1.5 sm:mr-2 opacity-70" />
                            {tr('查看详情', 'View Detail')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 sm:grid-cols-3">
              <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-3 sm:p-4 md:p-8 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <span className="text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{tr('组织余额', 'Org Balance')}</span>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center bg-primary/10 text-primary text-base sm:text-lg"><i className="fas fa-wallet" /></div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-primary mb-4 sm:mb-6">{formatCurrency(currentBalance)}</div>
                <button onClick={() => setShowRechargeModal(true)} className="btn-primary w-full justify-center rounded-full shadow-sm hover:shadow hover:-translate-y-0.5 transition-all text-xs sm:text-sm py-2 sm:py-2.5"><i className="fas fa-plus mr-1.5 sm:mr-2" />{tr('充值', 'Top Up')}</button>
              </div>
              <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-3 sm:p-4 md:p-8 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <span className="text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{tr('本月消耗', 'Monthly Spend')}</span>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center bg-warning/10 text-warning text-base sm:text-lg"><i className="fas fa-coins" /></div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mb-1.5 sm:mb-2">{formatCurrency(currentMonthSpend)}</div>
                <div className="text-[0.7rem] sm:text-xs font-medium text-text-secondary mt-1.5 sm:mt-2">{changePercentage === null ? tr('暂无上月对比数据', 'No comparison data for last month') : <>{tr('较上月', 'vs last month')} <span className={`px-1.5 py-0.5 sm:px-2 rounded-md ${changePercentage <= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'} ml-1`}>{changePercentage > 0 ? '+' : ''}{changePercentage}%</span></>}</div>
              </div>
              <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-3 sm:p-4 md:p-8 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <span className="text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{tr('预计可用', 'Estimated Coverage')}</span>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center bg-success/10 text-success text-base sm:text-lg"><i className="fas fa-calendar-check" /></div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mb-1.5 sm:mb-2">{estimatedAvailableDays === null ? '∞' : isZh ? `~${estimatedAvailableDays} 天` : `~${estimatedAvailableDays} days`}</div>
                <div className="text-[0.7rem] sm:text-xs font-medium text-text-secondary mt-1.5 sm:mt-2">{tr('按近 30 天日均', 'Based on the last 30 days average of')} <span className="font-semibold text-text-primary">{formatCurrency(averageDailySpend)}</span> {tr('消耗', 'per day')}</div>
              </div>
            </div>
            <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-3 sm:p-4 md:p-8 shadow-sm">
              <div className="mb-4 sm:mb-6 md:mb-8 flex flex-col items-start justify-between gap-3 sm:gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-text-primary mb-1.5 sm:mb-2">{tr('账单明细', 'Billing Details')}</h3>
                  <p className="text-text-secondary text-[0.7rem] sm:text-sm leading-relaxed">{tr('当前基于调用与账务记录聚合展示，支付与充值流水会继续逐步完善。', 'This view is currently aggregated from usage and ledger records. Payment and top-up entries will continue to be refined.')}</p>
                  {usageSyncing && (
                    <p className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-text-secondary">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                      {tr('正在同步最新用量与账务…', 'Syncing latest usage and billing...')}
                    </p>
                  )}
                </div>
                <button
                  className="btn-secondary rounded-full shadow-sm text-xs sm:text-sm w-full sm:w-auto justify-center px-4 sm:px-6 py-2 sm:py-2.5"
                  onClick={handleExportBilling}
                >
                  <i className="fas fa-download mr-1.5 sm:mr-2" />{tr('导出', 'Export')}
                </button>
              </div>
              {billingEntries.length === 0 ? (
                <div className="text-center py-12 sm:py-16 md:py-24 text-text-secondary bg-dark-light/10 rounded-xl sm:rounded-[1.5rem] border border-dashed border-border/60">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-sm"><i className="fas fa-receipt text-2xl sm:text-3xl text-text-secondary/40" /></div>
                  <p className="text-base sm:text-lg text-text-primary font-medium">{tr('暂无账单记录', 'No billing records')}</p>
                </div>
              ) : (
                <div className="-mx-3 px-3 sm:mx-0 sm:px-0">
                  <div className="flex flex-col gap-2.5 sm:gap-3 md:hidden">
                    {billingEntries.map((entry) => (
                      <div key={entry.id} className="bg-dark-light/5 border border-border/50 rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`px-1.5 py-0.5 sm:px-2 rounded text-[0.6rem] font-bold uppercase tracking-wider ${entry.type === 'recharge' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                              {entry.type === 'recharge' ? tr('充值', 'Recharge') : tr('消耗', 'Usage')}
                            </span>
                            <div className="font-semibold text-text-primary text-xs sm:text-sm mt-1">{entry.type === 'recharge' ? entry.title : entry.model}</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold text-xs sm:text-sm ${entry.status === 'failed' ? 'text-danger' : entry.type === 'recharge' ? 'text-success' : 'text-warning'}`}>
                              {formatBillingLineAmount(entry.amount, entry.type)}
                            </div>
                            <span
                              className={`px-1.5 py-0.5 sm:px-2 rounded text-[0.6rem] font-bold uppercase tracking-wider inline-block mt-0.5 sm:mt-1 ${
                                entry.status === 'failed'
                                  ? 'bg-danger/10 text-danger'
                                  : entry.type === 'recharge'
                                    ? 'bg-success/10 text-success'
                                    : 'bg-warning/10 text-warning'
                              }`}
                            >
                              {entry.status === 'failed'
                                ? tr('失败', 'Failed')
                                : entry.type === 'recharge'
                                  ? tr('已入账', 'Settled')
                                  : tr('成功', 'Success')}
                            </span>
                          </div>
                        </div>
                        {entry.description && <div className="text-[0.7rem] sm:text-xs text-text-secondary">{entry.description}</div>}
                        <div className="text-[0.7rem] sm:text-xs text-text-secondary flex justify-between mt-0.5 sm:mt-1 border-t border-border/50 pt-1.5 sm:pt-2">
                          <span>{formatDate(entry.created_at)}</span>
                          {entry.total_tokens ? <span>Tokens: {entry.total_tokens.toLocaleString()}</span> : null}
                        </div>
                        {entry.reference && <div className="text-[0.6rem] sm:text-[0.65rem] font-mono text-text-secondary opacity-70 truncate">{entry.reference}</div>}
                      </div>
                    ))}
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr className="border-b border-border/80">
                          {[tr('时间', 'Time'), tr('类型', 'Type'), tr('说明', 'Description'), tr('总 Token', 'Total Tokens'), tr('状态', 'Status'), tr('金额', 'Amount')].map((h) => (
                            <th key={h} className="text-left py-3 sm:py-4 px-3 sm:px-4 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-text-secondary">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {billingEntries.map((entry) => (
                          <tr key={entry.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                            <td className="py-3 px-3 sm:px-4 text-sm font-medium text-text-primary">{formatDate(entry.created_at)}</td>
                            <td className="py-3 px-3 sm:px-4">
                              <span className={`px-2.5 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider ${entry.type === 'recharge' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                {entry.type === 'recharge' ? tr('充值', 'Recharge') : tr('消耗', 'Usage')}
                              </span>
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-sm">
                              <div className="font-semibold text-text-primary">{entry.type === 'recharge' ? entry.title : entry.model}</div>
                              {entry.description ? (
                                <div className="text-text-secondary text-xs mt-1">{entry.description}</div>
                              ) : null}
                              {entry.reference && <div className="text-text-secondary text-[0.65rem] font-mono mt-1 opacity-70">{entry.reference}</div>}
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-sm text-text-secondary">{entry.total_tokens ? entry.total_tokens.toLocaleString() : '--'}</td>
                            <td className="py-3 px-3 sm:px-4">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider ${
                                  entry.status === 'failed'
                                    ? 'bg-danger/10 text-danger'
                                    : entry.type === 'recharge'
                                      ? 'bg-success/10 text-success'
                                      : 'bg-warning/10 text-warning'
                                }`}
                              >
                                {entry.status === 'failed'
                                  ? tr('失败', 'Failed')
                                  : entry.type === 'recharge'
                                    ? tr('已入账', 'Settled')
                                    : tr('成功', 'Success')}
                              </span>
                            </td>
                            <td className={`py-3 px-3 sm:px-4 text-sm font-bold ${entry.status === 'failed' ? 'text-danger' : entry.type === 'recharge' ? 'text-success' : 'text-warning'}`}>
                              {formatBillingLineAmount(entry.amount, entry.type)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-3 sm:p-4 md:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-text-primary mb-1.5 sm:mb-2">{tr('充值订单', 'Top-Up Orders')}</h3>
                  <p className="text-text-secondary text-[0.7rem] sm:text-sm leading-relaxed">{tr('订单现在会生成真实支付动作，国内渠道展示二维码，国际渠道跳转到外部收银台。', 'Orders now generate a real checkout action: domestic rails show a QR code, while international rails redirect to an external checkout page.')}</p>
                  <p className="text-text-secondary text-[0.7rem] sm:text-sm leading-relaxed mt-0.5 sm:mt-1">{tr('支付成功后优先由回调自动入账；只有显式启用手工补单时，才会开放人工确认。', 'Successful payments are credited primarily through gateway callbacks. Manual confirmation is only available when explicitly enabled as a fallback.')}</p>
                </div>
              </div>
              {paymentOrders.length === 0 ? (
                <div className="text-center py-12 sm:py-16 md:py-24 text-text-secondary bg-dark-light/10 rounded-xl sm:rounded-[1.5rem] border border-dashed border-border/60">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-sm"><i className="fas fa-credit-card text-2xl sm:text-3xl text-text-secondary/40" /></div>
                  <p className="text-base sm:text-lg text-text-primary font-medium">{tr('暂无充值订单', 'No top-up orders')}</p>
                </div>
              ) : (
                <div className="-mx-3 px-3 sm:mx-0 sm:px-0">
                  <div className="flex flex-col gap-2.5 sm:gap-3 md:hidden">
                    {paymentOrders.map((order) => (
                      <div key={order.id} className="bg-dark-light/5 border border-border/50 rounded-xl p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="font-semibold text-text-primary text-sm">
                              {order.currency} {order.amount.toFixed(2)}
                            </span>
                            <span className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                              <i className={`fas fa-${order.payment_method === 'alipay' ? 'alipay text-[#1677FF]' : order.payment_method === 'wechat_pay' ? 'weixin text-[#09B908]' : 'credit-card text-primary'}`} />
                              {getPaymentMethodLabel(order.payment_method)} ({paymentRegionLabel(order.payment_region)})
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded text-[0.6rem] font-bold uppercase tracking-wider inline-block ${
                              order.status === 'paid'
                                ? 'bg-success/10 text-success'
                                : order.status === 'pending'
                                  ? 'bg-warning/10 text-warning'
                                  : 'bg-danger/10 text-danger'
                            }`}>
                              {paymentStatusLabel(order.status)}
                            </span>
                            <div className="mt-2">
                              {order.status === 'pending' ? (
                                <button
                                  onClick={() => handleOpenCheckoutOrder(order)}
                                  className="btn-secondary text-xs py-1 px-3 rounded-full shadow-sm hover:border-success hover:text-success hover:bg-success/5 transition-colors"
                                >
                                  {tr('继续支付', 'Continue payment')}
                                </button>
                              ) : (
                                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-text-secondary">
                                  {order.fulfillment_status === 'applied' ? tr('已同步额度', 'Quota synced') : tr('已处理', 'Processed')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-text-secondary flex justify-between mt-1 border-t border-border/50 pt-2">
                          <span>{formatDate(order.created_at)}</span>
                          <span className="font-mono opacity-80 truncate ml-2 max-w-[120px]">{order.checkout_reference}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead>
                        <tr className="border-b border-border/80">
                          {[tr('时间', 'Time'), tr('支付方式', 'Payment Method'), tr('区域', 'Region'), tr('金额', 'Amount'), tr('状态', 'Status'), tr('订单号', 'Order ID'), tr('操作', 'Action')].map((h) => (
                            <th key={h} className="text-left py-3 sm:py-4 px-3 sm:px-4 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-text-secondary">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paymentOrders.map((order) => (
                          <tr key={order.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                            <td className="py-3 px-3 sm:px-4 text-sm font-medium text-text-primary">{formatDate(order.created_at)}</td>
                            <td className="py-3 px-3 sm:px-4 text-sm text-text-secondary">
                              <span className="flex items-center gap-2">
                                <i className={`fas fa-${order.payment_method === 'alipay' ? 'alipay text-[#1677FF]' : order.payment_method === 'wechat_pay' ? 'weixin text-[#09B908]' : 'credit-card text-primary'}`} />
                                {getPaymentMethodLabel(order.payment_method)}
                              </span>
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-sm text-text-secondary">{paymentRegionLabel(order.payment_region)}</td>
                            <td className="py-3 px-3 sm:px-4 text-sm font-semibold text-text-primary">{order.currency} {order.amount.toFixed(2)}</td>
                            <td className="py-3 px-3 sm:px-4">
                              <span className={`px-2.5 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider ${
                                order.status === 'paid'
                                  ? 'bg-success/10 text-success'
                                  : order.status === 'pending'
                                    ? 'bg-warning/10 text-warning'
                                    : 'bg-danger/10 text-danger'
                              }`}>
                                {paymentStatusLabel(order.status)}
                              </span>
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-xs font-mono text-text-secondary opacity-80">{order.checkout_reference}</td>
                            <td className="py-3 px-3 sm:px-4">
                              {order.status === 'pending' ? (
                                <button
                                  onClick={() => handleOpenCheckoutOrder(order)}
                                  className="btn-secondary text-xs py-1.5 px-4 rounded-full shadow-sm hover:border-success hover:text-success hover:bg-success/5 transition-colors"
                                >
                                  {tr('继续支付', 'Continue payment')}
                                </button>
                              ) : (
                                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-text-secondary">
                                  {order.fulfillment_status === 'applied' ? tr('已同步额度', 'Quota synced') : tr('已处理', 'Processed')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {teams.length === 0 && !teamLoading && (
              <div className="editorial-panel p-4 sm:p-6 md:p-8 text-center">
                <i className="fas fa-users text-2xl sm:text-3xl md:text-4xl text-text-secondary opacity-50 mb-2.5 sm:mb-3 md:mb-4" />
                <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-1.5 sm:mb-2">{tr('还没有团队', 'No teams yet')}</h3>
                <p className="text-text-secondary text-[0.7rem] sm:text-xs md:text-sm mb-2.5 sm:mb-3 md:mb-4">{tr('创建一个团队来开始协作', 'Create a team to start collaborating')}</p>
                <button onClick={() => setShowCreateTeamModal(true)} className="btn-primary text-xs sm:text-sm px-4 py-1.5 sm:px-5 sm:py-2 md:px-6 md:py-2.5">
                  <i className="fas fa-plus mr-1.5 sm:mr-2" />{tr('创建团队', 'Create Team')}
                </button>
              </div>
            )}

            {teamLoading && !currentTeam && (
              <div className="editorial-panel p-4 sm:p-5 md:p-6 lg:p-8 text-center">
                <i className="fas fa-spinner fa-spin text-lg sm:text-xl md:text-2xl text-primary mb-2.5 sm:mb-3 md:mb-4" />
                <p className="text-text-secondary text-[0.7rem] sm:text-xs md:text-sm">{tr('加载中...', 'Loading...')}</p>
              </div>
            )}

            {currentTeam && (
              <>
                <div className="space-y-3 sm:space-y-4 md:space-y-6">
                  <TeamDirectoryPanel
                    teams={teams}
                    currentTeam={currentTeam}
                    currentUserRole={currentUserRole}
                    onSelectTeam={handleSelectTeam}
                    onCreateTeam={() => setShowCreateTeamModal(true)}
                  />

                  <TeamInfoCard team={currentTeam} userRole={currentUserRole} onEdit={() => setShowTeamSettingsModal(true)} />

                  <div className="editorial-panel p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="flex flex-col gap-3 sm:gap-4 md:gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="max-w-2xl">
                        <div className="eyebrow">{tr('团队概览', 'Team Overview')}</div>
                        <h3 className="mt-1.5 sm:mt-2 md:mt-3 text-base sm:text-lg md:text-xl font-semibold">{tr('管理成员、邀请和角色权限', 'Manage members, invitations, and roles')}</h3>
                        <p className="mt-1.5 sm:mt-2 text-[0.7rem] sm:text-xs md:text-sm leading-5 sm:leading-6 md:leading-7 text-text-secondary">
                          {tr('在这里查看团队状态，并处理成员、邀请和权限相关操作。', 'Review team status and manage members, invitations, and permissions here.')}
                        </p>
                      </div>

                      <div className="grid gap-2 sm:gap-2.5 md:gap-3 grid-cols-2 sm:grid-cols-2 xl:min-w-[400px] 2xl:min-w-[440px]">
                        {[
                          { label: tr('成员', 'Members'), value: teamMemberCount, icon: 'fa-users', tone: 'text-primary bg-primary/12' },
                          { label: tr('管理员', 'Admins'), value: teamAdmins, icon: 'fa-user-shield', tone: 'text-warning bg-warning/12' },
                          { label: tr('待处理邀请', 'Pending'), value: pendingInvites, icon: 'fa-envelope', tone: 'text-[var(--page-accent-deep)] bg-[rgba(33,93,89,0.12)]' },
                          { label: tr('团队状态', 'Status'), value: tr('正常', 'Active'), icon: 'fa-diagram-project', tone: 'text-success bg-success/12' },
                        ].map((item) => (
                          <div key={item.label} className="rounded-lg sm:rounded-xl md:rounded-[1.125rem] border border-border bg-white/72 px-2.5 py-2.5 sm:px-3 sm:py-3 md:px-4 md:py-4">
                            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                              <div className={`flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg sm:rounded-xl ${item.tone}`}>
                                <i className={`fas ${item.icon} text-xs sm:text-sm md:text-base`} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm sm:text-base md:text-lg font-semibold leading-none">{item.value}</div>
                                <div className="mt-0.5 sm:mt-1 text-[0.6rem] sm:text-[0.625rem] md:text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.14em] md:tracking-[0.16em] text-text-secondary">{item.label}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 sm:mt-4 md:mt-5 flex flex-col gap-1.5 sm:gap-2 md:gap-3 border-t border-border pt-3 sm:pt-4 md:pt-5 sm:flex-row sm:flex-wrap">
                      <button
                        onClick={() => setShowTeamSettingsModal(true)}
                        className="btn-primary w-full justify-center px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm sm:w-auto"
                      >
                        <i className="fas fa-pen-to-square mr-1.5 sm:mr-2" />
                        {tr('编辑团队', 'Edit Team')}
                      </button>
                      {currentUserRole !== 'owner' && (
                        <button
                          onClick={handleLeaveTeam}
                          className="btn-secondary w-full justify-center px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm sm:w-auto"
                        >
                          <i className="fas fa-right-from-bracket mr-1.5 sm:mr-2" />
                          {tr('退出团队', 'Leave Team')}
                        </button>
                      )}
                      {currentUserRole === 'owner' && (
                        <>
                          <button onClick={() => setShowTransferOwnerModal(true)} className="btn-secondary w-full justify-center px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm sm:w-auto">
                            <i className="fas fa-exchange-alt mr-1.5 sm:mr-2" />
                            {tr('转让所有权', 'Transfer Ownership')}
                          </button>
                          <button
                            onClick={async () => {
                              if (!currentTeam) return;
                              const confirmed = await confirmDialog({
                                title: tr('删除团队', 'Delete team'),
                                message: isZh ? `确定要删除团队 "${currentTeam.name}"？此操作不可撤销。` : `Delete team "${currentTeam.name}"? This action cannot be undone.`,
                                confirmText: tr('删除团队', 'Delete team'),
                                cancelText: tr('取消', 'Cancel'),
                                tone: 'danger',
                              });
                              if (!confirmed) return;
                              try {
                                await dispatch(deleteTeam(currentTeam.id)).unwrap();
                                dispatch(showNotification({ message: tr('团队已删除', 'Team deleted') }));
                                refreshDashboardRoute(null, '/dashboard/team');
                              } catch (error) {
                                dispatch(showNotification({ message: getErrorMessage(error, tr('删除团队失败', 'Failed to delete team')), type: 'error' }));
                              }
                            }}
                            className="btn-secondary w-full justify-center border-danger/40 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm text-danger hover:bg-danger/10 sm:w-auto"
                          >
                            <i className="fas fa-trash mr-1.5 sm:mr-2" />
                            {tr('删除团队', 'Delete Team')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6">
                  <div className="-mx-3 mb-4 sm:mb-6 flex gap-1.5 sm:gap-2 overflow-x-auto border-b border-border px-3 pb-0 sm:mx-0 sm:px-0 scrollbar-hide">
                    {([
                      { id: 'members', label: tr('成员与角色', 'Members & Roles'), icon: 'fa-users' },
                      ...(canManageTeam ? [{ id: 'applications', label: tr('邀请与申请', 'Invites & Apps'), icon: 'fa-user-plus' }] : []),
                      ...(canManageTeam ? [{ id: 'audit', label: tr('审计日志', 'Audit Logs'), icon: 'fa-clipboard-list' }] : []),
                      { id: 'settings', label: tr('权限矩阵', 'Permission Matrix'), icon: 'fa-shield-halved' }
                    ] as Array<{ id: 'members' | 'applications' | 'audit' | 'settings'; label: string; icon: string }>).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setTeamActiveTab(tab.id)}
                        className={`px-3 py-2 sm:px-4 sm:py-3 font-medium whitespace-nowrap transition-all text-xs sm:text-sm md:text-base flex items-center gap-1.5 sm:gap-2 border-b-2 -mb-[1px] ${
                          teamActiveTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                        }`}
                      >
                        <i className={`fas ${tab.icon} text-[0.7rem] sm:text-sm`} />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {teamActiveTab === 'members' && (
                      <MemberList
                        members={members}
                        currentUserRole={currentUserRole}
                        currentUserId={currentUser?.id || ''}
                        onRoleChange={handleUpdateMemberRole}
                        onRemove={handleRemoveMember}
                        onInvite={canManageTeam ? () => setShowInviteModal(true) : undefined}
                        searchQuery={memberSearchQuery}
                        onSearchChange={setMemberSearchQuery}
                        roleFilter={memberRoleFilter}
                        onRoleFilterChange={setMemberRoleFilter}
                      />
                    )}

                    {teamActiveTab === 'applications' && canManageTeam && (
                      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
                        <PendingInvitationList
                          invitations={teamInvitations}
                          loading={teamLoading && !initialDataReady}
                          onCopyLink={(inviteUrl) => {
                            copyToClipboard(inviteUrl);
                            dispatch(showNotification({ message: tr('邀请链接已复制到剪贴板', 'Invite link copied to clipboard') }));
                          }}
                          onCancel={handleCancelInvitation}
                        />
                        <JoinApplicationsPanel
                          canManageTeam={canManageTeam}
                          applications={pendingJoinApplications}
                          myApplications={myJoinApplications}
                          onApply={handleApplyToJoinTeam}
                          onReview={handleReviewJoinApplication}
                        />
                      </div>
                    )}

                    {teamActiveTab === 'audit' && canManageTeam && (
                      <AuditLogList
                        logs={teamAuditLogs}
                        onExport={handleExportAuditLogs}
                        startDate={auditStartDate}
                        endDate={auditEndDate}
                        onDateRangeChange={(start, end) => { setAuditStartDate(start); setAuditEndDate(end); }}
                        actionFilter={auditActionFilter}
                        onActionFilterChange={setAuditActionFilter}
                      />
                    )}

                    {teamActiveTab === 'settings' && (
                      <div className="editorial-panel p-3 sm:p-4 md:p-6">
                        <div className="eyebrow text-[0.6rem] sm:text-[0.65rem]">{tr('权限矩阵', 'Permission Matrix')}</div>
                        <h3 className="mt-2 sm:mt-3 text-base sm:text-lg md:text-xl font-semibold">{tr('角色权限分配', 'Role Permissions')}</h3>
                        <p className="mt-1.5 sm:mt-2 text-[0.7rem] sm:text-xs md:text-sm leading-6 sm:leading-7 text-text-secondary">
                          {tr('以下是各角色在团队内所拥有的操作权限。', 'The following is a breakdown of permissions granted to each role within the team.')}
                        </p>
                        <div className="mt-4 sm:mt-5 grid grid-cols-1 gap-2.5 sm:gap-3 md:gap-4 md:grid-cols-2">
                          {teamPermissionRows.map((perm) => (
                            <div key={perm.name} className="rounded-xl sm:rounded-[1.125rem] md:rounded-[1.25rem] border border-border bg-white/72 px-3 py-3 sm:px-4 sm:py-4">
                              <div className="flex flex-col gap-2 sm:gap-2.5 md:gap-3">
                                <div>
                                  <div className="text-xs sm:text-sm font-medium">{perm.name}</div>
                                  <div className="mt-0.5 sm:mt-1 text-[0.7rem] sm:text-xs leading-5 sm:leading-6 text-text-secondary">{perm.desc}</div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                  {perm.owner && <span className="rounded-full bg-primary/18 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[0.65rem] sm:text-xs font-medium text-primary">Owner</span>}
                                  {perm.admin && <span className="rounded-full bg-warning/18 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[0.65rem] sm:text-xs font-medium text-warning">Admin</span>}
                                  {perm.member && <span className="rounded-full bg-success/18 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[0.65rem] sm:text-xs font-medium text-success">Member</span>}
                                  {perm.guest && <span className="rounded-full bg-secondary/18 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[0.65rem] sm:text-xs font-medium text-secondary">Guest</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 lg:grid-cols-3">
            {/* 个人信息 */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6 md:space-y-8">
              <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-3 sm:p-4 md:p-8 shadow-sm">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-text-primary mb-4 sm:mb-6">{tr('个人信息', 'Profile')}</h3>
                <form onSubmit={handleUpdateProfile}>
                  <div className="mb-6 sm:mb-8 flex flex-col items-start gap-4 sm:gap-5 sm:flex-row sm:items-center sm:gap-6">
                    <div className="relative group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] sm:rounded-[2rem] bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden text-white text-2xl sm:text-3xl font-bold shadow-md group-hover:shadow-lg transition-all">
                        {avatarImageUrl ? (
                          // Show uploaded/OAuth avatar when available.
                          <Image src={avatarImageUrl} alt={profileDisplayName} fill sizes="96px" className="object-cover" />
                        ) : (
                          profileData.avatar
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/40 rounded-[1.5rem] sm:rounded-[2rem] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <i className="fas fa-camera text-white text-lg sm:text-xl" />
                      </div>
                      <button type="button" className="absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2 w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center text-white text-[0.65rem] sm:text-xs shadow-md hover:scale-110 transition-transform">
                        <i className="fas fa-pen" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">{profileDisplayName}</h4>
                      <p className="text-text-secondary text-xs sm:text-sm mt-0.5 sm:mt-1">{currentUser?.email}</p>
                      <p className="inline-block px-2.5 py-1 sm:px-3 bg-dark-light/50 rounded-lg text-text-secondary text-[0.65rem] sm:text-xs mt-2 sm:mt-3 font-medium border border-border/50">{tr('注册于', 'Joined')} {formatDate(currentUser?.created_at || new Date().toISOString())}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-6 sm:mb-8">
                    <div>
                      <label className="block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary mb-1.5 sm:mb-2">{tr('昵称', 'Nickname')}</label>
                      <input type="text" className="form-control bg-dark-light/30 border-transparent focus:bg-white text-sm" value={profileData.nickname} onChange={e => setProfileData({...profileData, nickname: e.target.value})} placeholder={tr('设置昵称', 'Set a nickname')} />
                    </div>
                    <div>
                      <label className="block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary mb-1.5 sm:mb-2">{tr('邮箱', 'Email')}</label>
                      <input type="email" className="form-control bg-dark-light/50 border-transparent opacity-70 cursor-not-allowed text-sm" value={currentUser?.email || ''} disabled />
                    </div>
                    <div>
                      <label className="block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary mb-1.5 sm:mb-2">{tr('手机号状态', 'Phone Status')}</label>
                      <input type="text" className="form-control bg-dark-light/50 border-transparent opacity-70 cursor-not-allowed text-sm" value={currentUser?.phone ? `${currentUser.phone}${currentUser.phone_verified_at ? ` · ${tr('已验证', 'Verified')}` : ` · ${tr('未验证', 'Unverified')}`}` : tr('未绑定', 'Not bound')} disabled />
                    </div>
                    <div>
                      <label className="block text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary mb-1.5 sm:mb-2">{tr('用户 ID', 'User ID')}</label>
                      <input type="text" className="form-control bg-dark-light/50 border-transparent opacity-70 cursor-not-allowed font-mono text-sm" value={currentUser?.id || ''} disabled />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary rounded-full px-6 py-2.5 shadow-sm hover:shadow hover:-translate-y-0.5 transition-all"><i className="fas fa-save mr-2" />{tr('保存修改', 'Save Changes')}</button>
                </form>
              </div>

              {/* 安全设置 */}
              <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-3 sm:p-4 md:p-8 shadow-sm">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-text-primary mb-4 sm:mb-6">{tr('安全设置', 'Security')}</h3>
                  <div className="flex flex-col items-start gap-3 sm:gap-4 rounded-xl sm:rounded-[1.125rem] md:rounded-[1.25rem] border border-border/50 bg-dark-light/20 p-3 sm:p-4 md:p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-[1.125rem] md:rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-base sm:text-lg md:text-xl"><i className="fas fa-lock" /></div>
                      <div>
                        <div className="font-bold text-text-primary tracking-tight text-sm sm:text-base">{tr('登录密码', 'Password')}</div>
                        <div className="text-text-secondary text-[0.7rem] sm:text-xs md:text-sm mt-0.5">{tr('定期修改密码可提升账号安全性', 'Updating your password regularly improves account security')}</div>
                      </div>
                    </div>
                    <button onClick={() => setShowPasswordModal(true)} className="btn-secondary w-full justify-center rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm shadow-sm sm:w-auto">{tr('修改密码', 'Change Password')}</button>
                  </div>
                </div>

                <PhoneBindingCard
                  currentUser={currentUser}
                  currentTeamId={currentTeam?.id || null}
                  onUserUpdated={handleUserUpdated}
                  onNotify={(message, type = 'success') => dispatch(showNotification({ message, type }))}
                />

                <TwoFactorCard
                  currentUser={currentUser}
                  currentTeamId={currentTeam?.id || null}
                  onUserUpdated={handleUserUpdated}
                  onNotify={(message, type = 'success') => dispatch(showNotification({ message, type }))}
                />
              </div>
            </div>

            {/* 使用统计 */}
            <div className="space-y-4 sm:space-y-6 lg:space-y-8">
              <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-3 sm:p-4 md:p-8 shadow-sm">
                <h3 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-text-primary mb-4 sm:mb-6">{tr('使用统计', 'Usage Summary')}</h3>
                <div className="space-y-4 sm:space-y-5">
                  <div className="flex justify-between items-center pb-3 sm:pb-4 border-b border-border/50">
                    <span className="text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{tr('总请求数', 'Total Requests')}</span>
                    <span className="text-sm sm:text-base font-bold text-text-primary">{monthlyRequests.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 sm:pb-4 border-b border-border/50">
                    <span className="text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{tr('活跃天数', 'Active Days')}</span>
                    <span className="text-sm sm:text-base font-bold text-text-primary">{isZh ? `${activeDays} 天` : `${activeDays} days`}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 sm:pb-4 border-b border-border/50">
                    <span className="text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{tr('最后活跃', 'Last Active')}</span>
                    <span className="text-sm sm:text-base font-bold text-text-primary">{lastActiveLabel}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{tr('API 密钥数', 'API Keys')}</span>
                    <span className="text-sm sm:text-base font-bold text-text-primary">{activeKeys.length}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-white p-3 sm:p-4 md:p-8 shadow-sm">
                <h3 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-text-primary mb-4 sm:mb-6">{tr('账户状态', 'Account Status')}</h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-success/5 border border-success/10 rounded-lg sm:rounded-xl">
                    <i className="fas fa-check-circle text-success text-base sm:text-lg" />
                    <span className="text-xs sm:text-sm font-medium text-text-primary">{tr('邮箱已验证', 'Email verified')}</span>
                  </div>
                  <div className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border ${currentUser?.phone_verified_at ? 'bg-success/5 border-success/10' : 'bg-dark-light/20 border-border/50'}`}>
                    <i className={`fas ${currentUser?.phone_verified_at ? 'fa-check-circle text-success' : 'fa-times-circle text-text-secondary/50'} text-base sm:text-lg`} />
                    <span className={`text-xs sm:text-sm font-medium ${currentUser?.phone_verified_at ? 'text-text-primary' : 'text-text-secondary'}`}>{currentUser?.phone_verified_at ? tr('手机已验证', 'Phone verified') : tr('手机未验证', 'Phone not verified')}</span>
                  </div>
                  <div className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border ${currentUser?.two_factor_enabled ? 'bg-success/5 border-success/10' : 'bg-dark-light/20 border-border/50'}`}>
                    <i className={`fas ${currentUser?.two_factor_enabled ? 'fa-check-circle text-success' : 'fa-times-circle text-text-secondary/50'} text-base sm:text-lg`} />
                    <span className={`text-xs sm:text-sm font-medium ${currentUser?.two_factor_enabled ? 'text-text-primary' : 'text-text-secondary'}`}>{currentUser?.two_factor_enabled ? tr('双因素认证已开启', 'Two-factor authentication enabled') : tr('双因素认证未开启', 'Two-factor authentication disabled')}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-danger/20 bg-danger/5 p-3 sm:p-4 md:p-8 shadow-sm">
                <h3 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-danger mb-2 sm:mb-3">{tr('危险操作', 'Danger Zone')}</h3>
                <p className="text-text-secondary text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6">{tr('删除账户后，所有数据将无法恢复', 'Deleting the account will permanently remove all data')}</p>
                <button onClick={handleDeleteAccount} className="btn-secondary text-danger border-danger/30 bg-white hover:bg-danger/10 hover:border-danger/50 w-full justify-center text-xs sm:text-sm rounded-full shadow-sm py-2 sm:py-2.5 transition-colors">
                  <i className="fas fa-trash mr-1.5 sm:mr-2" />{tr('删除账户', 'Delete Account')}
                </button>
              </div>
            </div>
          </div>
        )}
              </>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (<div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}><div className="bg-white border border-border rounded-[2rem] shadow-xl p-6 sm:p-8 max-w-[550px] w-full max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-6"><h3 className="text-lg sm:text-xl font-semibold">{tr('创建 API 密钥', 'Create API Key')}</h3><button onClick={() => setShowCreateModal(false)} className="text-text-secondary hover:text-text-primary text-xl">&times;</button></div><form onSubmit={handleCreateKey}>
        <div className="space-y-4 mb-6">
          <div><label className="block text-sm text-text-secondary mb-2">{tr('密钥名称', 'Key Name')} <span className="text-danger">*</span></label><input type="text" className="form-control" required placeholder={tr('例如：生产环境、测试环境', 'e.g. Production, Staging')} value={keyName} onChange={e => setKeyName(e.target.value)} /></div>
          <div><label className="block text-sm text-text-secondary mb-2">{tr('备注说明', 'Notes')}</label><textarea className="form-control" rows={2} placeholder={tr('描述此密钥的用途...', 'Describe how this key will be used...')} value={keyRemark} onChange={e => setKeyRemark(e.target.value)} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm text-text-secondary mb-2">{tr('过期时间', 'Expiration')}</label><EditorialSelect value={keyExpiry} onChange={setKeyExpiry} options={[{ value: '', label: tr('永不过期', 'Never expires') }, { value: '7d', label: tr('7 天后', 'After 7 days') }, { value: '30d', label: tr('30 天后', 'After 30 days') }, { value: '90d', label: tr('90 天后', 'After 90 days') }, { value: '1y', label: tr('1 年后', 'After 1 year') }]} /></div>
            <div><label className="block text-sm text-text-secondary mb-2">{tr('IP 白名单', 'IP Allowlist')}</label><input type="text" className="form-control" placeholder={tr('多个 IP 用逗号分隔，留空则不限制', 'Separate multiple IPs with commas, leave empty for no restriction')} value={keyIpWhitelist} onChange={e => setKeyIpWhitelist(e.target.value)} /></div>
          </div>
          <div><label className="block text-sm text-text-secondary mb-2">{tr('允许的模型', 'Allowed Models')}</label><div className="flex flex-wrap gap-2">{apiKeyModelOptionsLoading ? <span className="text-text-secondary text-sm">{tr('正在加载模型列表...', 'Loading models...')}</span> : availableModelNames.length === 0 ? <span className="text-text-secondary text-sm">{tr('暂无可用模型，请稍后重试。', 'No models available yet. Try again later.')}</span> : availableModelNames.map(model => (<label key={model} className="flex items-center gap-2 px-3 py-2 bg-dark-light/50 rounded-lg cursor-pointer hover:bg-dark-light/70"><input type="checkbox" className="rounded" checked={keyModels.includes(model)} onChange={e => { if (e.target.checked) setKeyModels([...keyModels, model]); else setKeyModels(keyModels.filter(m => m !== model)); }} /><span className="text-sm">{model}</span></label>))}</div><p className="text-text-secondary text-xs mt-1">{tr('不选择则允许所有模型', 'Leave empty to allow all models')}</p></div>
          <div><label className="block text-sm text-text-secondary mb-2">{tr('权限范围', 'Permission Scopes')}</label><div className="flex flex-wrap gap-2">{apiKeyPermissionScopeOptions.map(scope => (<label key={scope.value} className="flex items-center gap-2 px-3 py-2 bg-dark-light/50 rounded-lg cursor-pointer hover:bg-dark-light/70"><input type="checkbox" className="rounded" checked={keyPermissionScopes.includes(scope.value)} onChange={e => { if (e.target.checked) setKeyPermissionScopes([...keyPermissionScopes, scope.value]); else setKeyPermissionScopes(keyPermissionScopes.filter(item => item !== scope.value)); }} /><span className="text-sm">{scope.label}</span></label>))}</div><p className="text-text-secondary text-xs mt-1">{tr('可与模型范围和 IP 白名单一起使用，进一步限制这枚密钥的访问范围。', 'Use together with model restrictions and IP allowlists to further limit what this key can access.')}</p></div>
        </div>
        <div className="flex gap-3"><button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1 justify-center">{tr('取消', 'Cancel')}</button><button type="submit" className="btn-primary flex-1 justify-center">{tr('创建密钥', 'Create Key')}</button></div>
      </form></div></div>)}
      {showKeyModal && (<div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={() => setShowKeyModal(false)}><div className="bg-white border border-border rounded-[2rem] shadow-xl p-6 sm:p-8 max-w-[500px] w-full" onClick={e => e.stopPropagation()}><h3 className="text-lg sm:text-xl font-semibold mb-4">{tr('保存您的 API 密钥', 'Save Your API Key')}</h3><div className="bg-danger/10 border border-danger rounded-lg p-3 sm:p-4 mb-4 text-xs sm:text-sm"><i className="fas fa-exclamation-triangle text-danger mr-2" />{tr('请立即复制并保存，密钥只显示一次！', 'Copy and save this key now. It will only be shown once!')}</div><div className="flex gap-2 mb-6"><input type="text" className="form-control font-mono text-xs sm:text-sm" readOnly value={newKeyValue} /><button className="btn-primary flex-shrink-0" onClick={() => { copyToClipboard(newKeyValue); dispatch(showNotification({ message: tr('已复制', 'Copied') })); }}><i className="fas fa-copy" /></button></div><button className="btn-secondary w-full justify-center" onClick={() => setShowKeyModal(false)}>{tr('我已保存', 'I have saved it')}</button></div></div>)}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={() => setShowRechargeModal(false)}>
          <div className="bg-white border border-border rounded-[2rem] shadow-xl p-6 sm:p-8 max-w-[520px] w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg sm:text-xl font-semibold">{tr('账户充值', 'Top Up Account')}</h3>
              <button onClick={() => setShowRechargeModal(false)} className="text-text-secondary hover:text-text-primary text-xl">&times;</button>
            </div>
            <div className="mb-6">
              <div className="text-sm text-text-secondary mb-3">{tr('快捷金额', 'Quick Amount')}</div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[10, 50, 100, 200, 500, 1000].map((amount) => (
                  <button
                    key={amount}
                    className={`py-2 sm:py-3 border rounded-lg transition-all text-sm sm:text-base ${Number(rechargeAmount) === amount ? 'border-primary text-primary bg-primary/10' : 'border-border hover:border-primary hover:text-primary'}`}
                    onClick={() => setRechargeAmount(String(amount))}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm text-text-secondary mb-2">{tr('自定义金额', 'Custom Amount')}</label>
              <input type="number" className="form-control" placeholder={tr('输入金额', 'Enter amount')} min="1" value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)} />
            </div>
            <div className="mb-6">
              <div className="text-sm text-text-secondary mb-2">{paymentMethodGroupLabel}</div>
              <div className="grid grid-cols-2 gap-3">
                {visiblePaymentMethods.map((method) => (
                  <button
                    key={method}
                    onClick={() => setSelectedPaymentMethod(method)}
                    className={`py-3 border rounded-lg text-sm transition-all ${selectedPaymentMethod === method ? 'border-primary text-primary bg-primary/10' : 'border-border hover:border-primary hover:text-primary'}`}
                  >
                    {getPaymentMethodLabel(method)}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-dark-light/40 border border-border rounded-lg p-4 mb-6 text-sm text-text-secondary space-y-2">
              <div className="flex justify-between gap-4">
                <span>{tr('当前渠道', 'Selected Rail')}</span>
                <span className="text-text-primary">{getPaymentMethodLabel(selectedPaymentMethod)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{tr('结算币种', 'Settlement Currency')}</span>
                <span className="text-text-primary">{isDomesticAudience ? 'CNY' : 'USD'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{tr('支付动作', 'Checkout Action')}</span>
                <span className="text-text-primary">{isDomesticAudience ? tr('生成二维码', 'Generate QR code') : tr('跳转收银台', 'Redirect to checkout')}</span>
              </div>
            </div>
            <button className="btn-primary w-full justify-center" onClick={handleCreatePaymentOrder}>
              <i className="fas fa-credit-card mr-2" />
              {tr('创建并继续支付', 'Create and continue to payment')}
            </button>
          </div>
        </div>
      )}
      {checkoutOrder && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={() => setCheckoutOrder(null)}>
          <div className="bg-white border border-border rounded-[2rem] shadow-xl p-6 sm:p-8 max-w-[620px] w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-4 mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-text-primary">{tr('完成充值支付', 'Complete top-up payment')}</h3>
                <p className="text-sm text-text-secondary mt-1">
                  {tr('订单创建成功。请按照下面的支付动作完成付款，到账后可刷新当前状态。', 'The order was created successfully. Follow the checkout action below and refresh the status once payment completes.')}
                </p>
              </div>
              <button onClick={() => setCheckoutOrder(null)} className="text-text-secondary hover:text-text-primary text-xl">&times;</button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <div className="rounded-2xl border border-border bg-dark-light/10 p-4 sm:col-span-2">
                <div className="text-[0.7rem] uppercase tracking-[0.18em] text-text-secondary mb-2">{tr('订单金额', 'Amount')}</div>
                <div className="text-2xl font-bold text-text-primary">{checkoutOrder.currency} {checkoutOrder.amount.toFixed(2)}</div>
                <div className="mt-3 text-sm text-text-secondary">{getPaymentMethodLabel(checkoutOrder.payment_method)} · {paymentRegionLabel(checkoutOrder.payment_region)}</div>
                <div className="mt-2 text-xs font-mono text-text-secondary break-all">{checkoutOrder.checkout_reference}</div>
              </div>
              <div className="rounded-2xl border border-border bg-dark-light/10 p-4">
                <div className="text-[0.7rem] uppercase tracking-[0.18em] text-text-secondary mb-2">{tr('订单状态', 'Order Status')}</div>
                <div className={`inline-flex px-2.5 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider ${
                  checkoutOrder.status === 'paid'
                    ? 'bg-success/10 text-success'
                    : checkoutOrder.status === 'pending'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-danger/10 text-danger'
                }`}>
                  {paymentStatusLabel(checkoutOrder.status)}
                </div>
                <div className="mt-3 text-xs text-text-secondary">{tr('过期时间', 'Expires at')}: {checkoutOrder.expires_at ? formatDate(checkoutOrder.expires_at) : '--'}</div>
              </div>
            </div>

            {checkoutAction?.mode === 'qr_code' && checkoutAction.qr_code_value ? (
              <div className="rounded-[1.5rem] border border-border bg-dark-light/5 p-5 mb-6">
                <div className="flex flex-col items-center text-center">
                  <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                    <QRCodeSVG value={checkoutAction.qr_code_value} size={208} includeMargin />
                  </div>
                  <p className="mt-4 text-sm text-text-secondary leading-6">
                    {tr('请使用对应支付应用扫码完成付款。支付成功后，收银台会通过回调自动更新订单状态。', 'Scan this code with the selected payment app. After payment succeeds, the checkout page should update the order through a webhook callback.')}
                  </p>
                </div>
              </div>
            ) : null}

            {checkoutAction?.display_url ? (
              <div className="rounded-2xl border border-border bg-dark-light/5 p-4 mb-6">
                <div className="text-[0.7rem] uppercase tracking-[0.18em] text-text-secondary mb-2">{tr('支付链接', 'Checkout link')}</div>
                <div className="text-sm break-all leading-6 text-text-primary">{checkoutAction.display_url}</div>
              </div>
            ) : null}

            {checkoutAction?.mode === 'manual_review' ? (
              <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 mb-6 text-sm text-text-secondary leading-6">
                {tr('当前渠道未配置外部收银台，订单保留为人工补单模式。只有在显式开启手工确认时，才允许直接入账。', 'This rail does not have an external checkout URL configured, so the order remains in manual fallback mode. Direct credit is only allowed when manual confirmation is explicitly enabled.')}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-dark-light/5 p-4 mb-6 text-sm text-text-secondary leading-6">
                {checkoutAction?.webhook_enabled
                  ? tr('当前环境已启用支付回调。完成付款后，如状态未及时变化，可手动刷新订单状态。', 'Payment webhooks are enabled in this environment. If the status does not update immediately after payment, refresh the order status manually.')
                  : tr('当前环境尚未配置支付回调。完成付款后需要通过手工补单开关来兜底确认。', 'Payment webhooks are not configured in this environment. After payment, manual fallback confirmation is required if it is enabled.')}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {checkoutAction?.url ? (
                <button className="btn-primary flex-1 justify-center" onClick={() => handleOpenCheckoutUrl(checkoutOrder)}>
                  <i className="fas fa-arrow-up-right-from-square mr-2" />
                  {checkoutAction.mode === 'redirect' ? tr('打开收银台', 'Open checkout') : tr('打开支付链接', 'Open payment link')}
                </button>
              ) : null}
              <button className="btn-secondary flex-1 justify-center" onClick={handleRefreshPaymentStatus}>
                <i className="fas fa-rotate-right mr-2" />
                {tr('刷新支付状态', 'Refresh payment status')}
              </button>
              {checkoutAction?.manual_confirm_allowed && checkoutOrder.status === 'pending' ? (
                <button className="btn-secondary flex-1 justify-center" onClick={() => handleConfirmPaymentOrder(checkoutOrder.id)}>
                  <i className="fas fa-receipt mr-2" />
                  {tr('手工补单入账', 'Manual credit fallback')}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
      {showPasswordModal && (<div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={() => setShowPasswordModal(false)}><div className="bg-white border border-border rounded-[2rem] shadow-xl p-6 sm:p-8 max-w-[450px] w-full" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-6"><h3 className="text-lg sm:text-xl font-semibold">{tr('修改密码', 'Change Password')}</h3><button onClick={() => setShowPasswordModal(false)} className="text-text-secondary hover:text-text-primary text-xl">&times;</button></div><form onSubmit={handleChangePassword}><div className="space-y-4 mb-6"><div><label className="block text-sm text-text-secondary mb-2">{tr('当前密码', 'Current Password')}</label><input type="password" className="form-control" required value={passwordData.current} onChange={e => setPasswordData({...passwordData, current: e.target.value})} /></div><div><label className="block text-sm text-text-secondary mb-2">{tr('新密码', 'New Password')}</label><input type="password" className="form-control" required minLength={6} value={passwordData.newPass} onChange={e => setPasswordData({...passwordData, newPass: e.target.value})} /></div><div><label className="block text-sm text-text-secondary mb-2">{tr('确认新密码', 'Confirm New Password')}</label><input type="password" className="form-control" required value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} /></div></div><button type="submit" className="btn-primary w-full justify-center">{tr('确认修改', 'Confirm Change')}</button></form></div></div>)}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={avatarUploading ? undefined : () => setShowAvatarModal(false)}>
          <div className="bg-white border border-border rounded-[2rem] shadow-xl p-6 sm:p-8 max-w-[450px] w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg sm:text-xl font-semibold">{tr('更换头像', 'Change Avatar')}</h3>
              <button onClick={avatarUploading ? undefined : () => setShowAvatarModal(false)} className="text-text-secondary hover:text-text-primary text-xl">
                &times;
              </button>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-secondary text-3xl font-bold text-white shadow-md">
                {avatarImageUrl ? (
                  <Image src={avatarImageUrl} alt={profileDisplayName} fill sizes="96px" className="object-cover" />
                ) : (
                  profileDisplayName.charAt(0).toUpperCase()
                )}
              </div>
              <p className="text-sm text-text-secondary leading-6">
                {tr('上传 PNG、JPEG、WEBP 或 SVG 图片，保存后会同步更新你的个人头像。', 'Upload a PNG, JPEG, WEBP, or SVG image to update your profile avatar.')}
              </p>
              <label className={`mt-5 inline-flex cursor-pointer items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition hover:border-primary hover:text-primary ${avatarUploading ? 'pointer-events-none opacity-60' : ''}`}>
                <i className={`fas ${avatarUploading ? 'fa-spinner fa-spin' : 'fa-upload'} mr-2 text-sm`} />
                {avatarUploading ? tr('上传中', 'Uploading') : tr('上传头像', 'Upload Avatar')}
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] || null;
                    void handleAvatarUpload(nextFile);
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}
      {showEditKeyModal && editingKey && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={() => setShowEditKeyModal(false)}>
          <div className="bg-white border border-border rounded-[2rem] shadow-xl p-6 sm:p-8 max-w-[600px] w-full max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg sm:text-xl font-semibold">{tr('编辑 API 密钥', 'Edit API Key')}</h3>
              <button onClick={() => setShowEditKeyModal(false)} className="text-text-secondary hover:text-text-primary text-xl">&times;</button>
            </div>
            <form onSubmit={handleSaveKeyEdit}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">{tr('密钥名称', 'Key Name')}</label>
                  <input type="text" className="form-control" required value={keyName} onChange={e => setKeyName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">{tr('备注说明', 'Notes')}</label>
                  <textarea className="form-control" rows={2} placeholder={tr('描述此密钥的用途...', 'Describe how this key will be used...')} value={keyRemark} onChange={e => setKeyRemark(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">{tr('密钥值', 'Key Value')}</label>
                  <div className="flex gap-2">
                    <input type="text" className="form-control font-mono text-sm" readOnly value={editingKey.key} />
                    <button type="button" className="btn-secondary flex-shrink-0" onClick={() => { copyToClipboard(editingKey.key); dispatch(showNotification({ message: tr('已复制', 'Copied') })); }}>
                      <i className="fas fa-copy" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">{tr('状态', 'Status')}</label>
                    <EditorialSelect value={editKeyStatus} onChange={(value) => setEditKeyStatus(value as 'active' | 'disabled')} options={[{ value: 'active', label: tr('活跃', 'Active') }, { value: 'disabled', label: tr('已禁用', 'Disabled') }]} />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">{tr('创建时间', 'Created At')}</label>
                    <input type="text" className="form-control" readOnly value={formatDate(editingKey.created_at)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">{tr('IP 白名单', 'IP Allowlist')}</label>
                  <input type="text" className="form-control" placeholder={tr('多个 IP 用逗号分隔，留空则不限制', 'Separate multiple IPs with commas, leave empty for no restriction')} value={keyIpWhitelist} onChange={e => setKeyIpWhitelist(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">{tr('允许的模型', 'Allowed Models')}</label>
                  <div className="flex flex-wrap gap-2">
                    {apiKeyModelOptionsLoading ? (
                      <span className="text-text-secondary text-sm">{tr('正在加载模型列表...', 'Loading models...')}</span>
                    ) : availableModelNames.length === 0 ? (
                      <span className="text-text-secondary text-sm">{tr('暂无可用模型，请稍后重试。', 'No models available yet. Try again later.')}</span>
                    ) : (
                      availableModelNames.map(model => (
                        <label key={model} className="flex items-center gap-2 px-3 py-2 bg-dark-light/50 rounded-lg cursor-pointer hover:bg-dark-light/70">
                          <input type="checkbox" className="rounded" checked={keyModels.includes(model)} onChange={e => { if (e.target.checked) setKeyModels([...keyModels, model]); else setKeyModels(keyModels.filter(m => m !== model)); }} />
                          <span className="text-sm">{model}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">{tr('权限范围', 'Permission Scopes')}</label>
                  <div className="flex flex-wrap gap-2">
                    {apiKeyPermissionScopeOptions.map(scope => (
                      <label key={scope.value} className="flex items-center gap-2 px-3 py-2 bg-dark-light/50 rounded-lg cursor-pointer hover:bg-dark-light/70">
                        <input type="checkbox" className="rounded" checked={keyPermissionScopes.includes(scope.value)} onChange={e => { if (e.target.checked) setKeyPermissionScopes([...keyPermissionScopes, scope.value]); else setKeyPermissionScopes(keyPermissionScopes.filter(item => item !== scope.value)); }} />
                        <span className="text-sm">{scope.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-text-secondary text-xs mt-1">{tr('可与模型范围和 IP 白名单一起使用，进一步限制这枚密钥的访问范围。', 'Use together with model restrictions and IP allowlists to further limit what this key can access.')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEditKeyModal(false)} className="btn-secondary flex-1 justify-center">{tr('取消', 'Cancel')}</button>
                <button type="submit" className="btn-primary flex-1 justify-center">{tr('保存修改', 'Save Changes')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 团队管理弹窗组件 */}
      <CreateTeamModal
        isOpen={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        onSubmit={handleCreateTeam}
        loading={teamLoading}
      />
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSubmit={handleInviteMember}
        currentUserRole={currentUserRole}
        loading={teamLoading}
      />
      {currentTeam && (
        <TeamSettingsModal
          isOpen={showTeamSettingsModal}
          onClose={() => setShowTeamSettingsModal(false)}
          onSubmit={handleUpdateTeam}
          team={currentTeam}
          loading={teamLoading}
        />
      )}
      <TransferOwnerModal
        isOpen={showTransferOwnerModal}
        onClose={() => setShowTransferOwnerModal(false)}
        onSubmit={handleTransferOwnership}
        members={members.filter(m => m.role !== 'owner')}
        loading={teamLoading}
      />
    </>
  );
}
