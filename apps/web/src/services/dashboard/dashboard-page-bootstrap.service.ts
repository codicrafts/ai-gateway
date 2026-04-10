import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { getBillingSummary } from '@/services/billing/billing.service';
import { listGatewayConfiguredModels } from '@/services/gateway/gateway-model.service';
import { listPaymentOrders } from '@/services/billing/payment.service';
import { listGatewayApiKeys } from '@/services/gateway/gateway-token.service';
import { listGatewayUsage } from '@/services/gateway/gateway-usage.service';
import { resolveGatewayScope } from '@/services/gateway/gateway-scope.service';
import { getRuntimeMonitoringSnapshot } from '@/services/monitoring/runtime-monitoring.service';
import { listTeamAuditLogs } from '@/services/team/team-audit.service';
import { listTeamInvitations } from '@/services/team/team-invitation.service';
import { listTeamJoinApplications, listUserJoinApplications } from '@/services/team/team-join-application.service';
import { getTeamWorkspaceForUser } from '@/services/team/team-query.service';
import type {
  AuditLog,
  TeamDetail,
  TeamInvitation,
  TeamJoinApplication,
  TeamListItem,
  TeamMember,
} from '@ai-gateway/shared-types/team';
import type {
  ApiKey,
  BillingSummary,
  PaymentOrder,
  RuntimeMonitoringSnapshot,
  UsageLog,
  UsageStats,
} from '@/store/slices/dashboardSlice';
import type { Model } from '@ai-gateway/shared-types';

export type DashboardBootstrapSection =
  | 'overview'
  | 'api-keys'
  | 'usage'
  | 'providers'
  | 'routing'
  | 'billing'
  | 'profile'
  | 'team';

export type DashboardPageBootstrapPayload = {
  section: DashboardBootstrapSection;
  team: {
    teams: TeamListItem[];
    current_team: TeamDetail | null;
    members: TeamMember[];
    audit_logs: AuditLog[];
    invitations: TeamInvitation[];
    join_applications: TeamJoinApplication[];
    my_join_applications: TeamJoinApplication[];
  };
  dashboard: {
    team_id: string | null;
    api_keys: ApiKey[];
    available_models: Model[];
    usage: {
      logs: UsageLog[];
      stats: UsageStats | null;
      page: number;
      limit: number;
    };
    billing_summary: BillingSummary;
    payment_orders: PaymentOrder[];
    monitoring: RuntimeMonitoringSnapshot | null;
  };
};

type DashboardPageBootstrapOptions = {
  requestedTeamId?: string | null;
  section?: DashboardBootstrapSection;
};

export async function getDashboardPageBootstrap(
  options: DashboardPageBootstrapOptions = {}
): Promise<DashboardPageBootstrapPayload> {
  const { requestedTeamId = null, section = 'overview' } = options;
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    throw new Error('请先登录');
  }

  const needsTeamWorkspace = section === 'team';
  const needsApiKeys = section === 'overview' || section === 'api-keys';
  const needsUsage = section === 'overview' || section === 'usage' || section === 'api-keys';
  const needsBillingSummary = section === 'overview' || section === 'billing';
  const needsPaymentOrders = section === 'overview' || section === 'billing';
  const needsAvailableModels = section === 'api-keys';

  if (needsTeamWorkspace) {
    const workspace = await getTeamWorkspaceForUser(appUser.id, requestedTeamId);

    if (!workspace.selectedTeam || !workspace.currentTeam) {
      return {
        section,
        team: {
          teams: [],
          current_team: null,
          members: [],
          audit_logs: [],
          invitations: [],
          join_applications: [],
          my_join_applications: [],
        },
        dashboard: {
          team_id: requestedTeamId || null,
          api_keys: [],
          available_models: [],
          usage: { logs: [], stats: null, page: 0, limit: 50 },
          billing_summary: {
            current_balance: 0,
            current_month_spend: 0,
            previous_month_spend: 0,
            change_percentage: null,
            average_daily_spend: 0,
            estimated_available_days: null,
            recent_entries: [],
            currency: 'USD',
          },
          payment_orders: [],
          monitoring: null,
        },
      };
    }

    const canManageTeam =
      workspace.currentUserRole === 'owner' || workspace.currentUserRole === 'admin';

    const [auditLogResult, invitationResult, joinApplicationsResult, myJoinApplications] = await Promise.all([
      canManageTeam
        ? listTeamAuditLogs(workspace.selectedTeam.id, { page: 1, limit: 20 })
        : Promise.resolve({ logs: [], total: 0, page: 1, limit: 20 }),
      canManageTeam
        ? listTeamInvitations(workspace.selectedTeam.id, { status: 'pending', page: 1, limit: 20 })
        : Promise.resolve({ items: [], total: 0, page: 1, limit: 20, total_pages: 0 }),
      canManageTeam
        ? listTeamJoinApplications({ teamId: workspace.selectedTeam.id, page: 1, limit: 10, status: 'pending' })
        : Promise.resolve({ items: [], total: 0, page: 1, limit: 10, total_pages: 0 }),
      listUserJoinApplications(appUser.id),
    ]);

    return {
      section,
      team: {
        teams: workspace.teams,
        current_team: workspace.currentTeam,
        members: workspace.currentTeam.members,
        audit_logs: auditLogResult.logs,
        invitations: invitationResult.items,
        join_applications: joinApplicationsResult.items,
        my_join_applications: myJoinApplications,
      },
      dashboard: {
        team_id: workspace.selectedTeam.id,
        api_keys: [],
        available_models: [],
        usage: { logs: [], stats: null, page: 0, limit: 50 },
        billing_summary: {
          current_balance: 0,
          current_month_spend: 0,
          previous_month_spend: 0,
          change_percentage: null,
          average_daily_spend: 0,
          estimated_available_days: null,
          recent_entries: [],
          currency: 'USD',
        },
        payment_orders: [],
        monitoring: null,
      },
    };
  }

  const scope = await resolveGatewayScope(appUser.id, requestedTeamId);
  const selectedTeamId = scope.kind === 'team' ? scope.teamId : null;

  const [
    apiKeys,
    availableModels,
    usage,
    billingSummary,
    paymentOrders,
    monitoring,
  ] = await Promise.all([
    needsApiKeys
      ? listGatewayApiKeys({ userId: appUser.id, teamId: requestedTeamId || null })
      : Promise.resolve([]),
    needsAvailableModels
      ? listGatewayConfiguredModels().catch(() => [])
      : Promise.resolve([]),
    needsUsage
      ? listGatewayUsage({ userId: appUser.id, teamId: requestedTeamId || null, page: 0, limit: 50 })
      : Promise.resolve({ logs: [], stats: null, page: 0, limit: 50 }),
    needsBillingSummary
      ? getBillingSummary(appUser, requestedTeamId || null)
      : Promise.resolve({
          current_balance: 0,
          current_month_spend: 0,
          previous_month_spend: 0,
          change_percentage: null,
          average_daily_spend: 0,
          estimated_available_days: null,
          recent_entries: [],
          currency: 'USD' as const,
        }),
    needsPaymentOrders ? listPaymentOrders(appUser.id, selectedTeamId) : Promise.resolve([]),
    needsUsage
      ? getRuntimeMonitoringSnapshot({ hours: 24, channelLimit: 10 }).catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    section,
    team: {
      teams: [],
      current_team: null,
      members: [],
      audit_logs: [],
      invitations: [],
      join_applications: [],
      my_join_applications: [],
    },
    dashboard: {
      team_id: selectedTeamId,
      api_keys: apiKeys,
      available_models: availableModels,
      usage,
      billing_summary: billingSummary,
      payment_orders: paymentOrders,
      monitoring,
    },
  };
}
