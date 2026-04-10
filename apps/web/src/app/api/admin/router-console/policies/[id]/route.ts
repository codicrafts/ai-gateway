import { assertProviderConsoleAccess } from '@/services/admin/provider-console-access.service';
import { removeRouterConsolePolicy, updateRouterConsolePolicy } from '@/services/admin/router-console.service';
import { fail, ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      team_id?: string | null;
      actor_user_id?: string | null;
      policy_name: string;
      fallback_enabled?: boolean;
      retry_count?: number;
      load_balance_mode?: 'priority' | 'weighted' | 'round_robin' | 'manual';
      channel_weights?: Record<string, unknown>;
      channel_priorities?: Record<string, unknown>;
      rate_limit?: Record<string, unknown>;
      affinity_ttl?: number | null;
      circuit_breaker_enabled?: boolean;
      config_payload?: Record<string, unknown>;
    };

    if (!body.team_id) {
      return fail('缺少 team_id', 400);
    }

    await assertProviderConsoleAccess(body.team_id);
    const policy = await updateRouterConsolePolicy(id, {
      teamId: body.team_id,
      actorUserId: body.actor_user_id ?? null,
      policy_name: body.policy_name,
      fallback_enabled: body.fallback_enabled,
      retry_count: body.retry_count,
      load_balance_mode: body.load_balance_mode,
      channel_weights: body.channel_weights,
      channel_priorities: body.channel_priorities,
      rate_limit: body.rate_limit,
      affinity_ttl: body.affinity_ttl,
      circuit_breaker_enabled: body.circuit_breaker_enabled,
      config_payload: body.config_payload,
    });
    return ok(policy);
  } catch (error) {
    const status = typeof (error as { status?: number })?.status === 'number'
      ? (error as { status: number }).status
      : 500;
    return fail(error instanceof Error ? error.message : '服务器内部错误', status);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const teamId = url.searchParams.get('team_id');
    if (!teamId) {
      return fail('缺少 team_id', 400);
    }

    await assertProviderConsoleAccess(teamId);
    await removeRouterConsolePolicy(id, teamId);
    return ok({ success: true });
  } catch (error) {
    const status = typeof (error as { status?: number })?.status === 'number'
      ? (error as { status: number }).status
      : 500;
    return fail(error instanceof Error ? error.message : '服务器内部错误', status);
  }
}
