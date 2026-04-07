import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  Team,
  TeamDetail,
  TeamListItem,
  TeamMember,
  AuditLog,
  CreateTeamRequest,
  UpdateTeamRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
  TransferOwnershipRequest,
  TeamListQuery,
  MemberListQuery,
  AuditLogQuery,
  TeamListResponse,
  TeamDetailResponse,
  CreateTeamResponse,
  UpdateTeamResponse,
  DeleteTeamResponse,
  MemberListResponse,
  InviteMemberResponse,
  UpdateMemberRoleResponse,
  RemoveMemberResponse,
  TransferOwnershipResponse,
  AuditLogResponse,
  AuditLogExportResponse,
  TeamInvitation,
} from '@ai-gateway/shared-types/team';

// ============ State 定义 ============

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface TeamState {
  currentTeam: TeamDetail | null;
  teams: TeamListItem[];
  members: TeamMember[];
  auditLogs: AuditLog[];
  invitations: TeamInvitation[];
  loading: boolean;
  error: string | null;
  pagination: {
    teams: PaginationState;
    members: PaginationState;
    auditLogs: { page: number; limit: number; total: number };
  };
}

const initialState: TeamState = {
  currentTeam: null,
  teams: [],
  members: [],
  auditLogs: [],
  invitations: [],
  loading: false,
  error: null,
  pagination: {
    teams: { page: 1, limit: 20, total: 0, total_pages: 0 },
    members: { page: 1, limit: 20, total: 0, total_pages: 0 },
    auditLogs: { page: 1, limit: 50, total: 0 },
  },
};


// ============ Async Thunks - 团队管理 ============

// 获取团队列表
export const fetchTeams = createAsyncThunk<
  TeamListResponse['data'],
  TeamListQuery | undefined,
  { rejectValue: string }
>('team/fetchTeams', async (query, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));

    const response = await fetch(`/api/teams?${params.toString()}`);
    const data: TeamListResponse = await response.json();

    if (!data.success || !data.data) {
      return rejectWithValue(data.error || '获取团队列表失败');
    }

    return data.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '网络错误');
  }
});

// 获取团队详情
export const fetchTeamDetail = createAsyncThunk<
  TeamDetail,
  string,
  { rejectValue: string }
>('team/fetchTeamDetail', async (teamId, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/teams/${teamId}`);
    const data: TeamDetailResponse = await response.json();

    if (!data.success || !data.data) {
      return rejectWithValue(data.error || '获取团队详情失败');
    }

    return data.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '网络错误');
  }
});

// 创建团队
export const createTeam = createAsyncThunk<
  Team,
  CreateTeamRequest,
  { rejectValue: string }
>('team/createTeam', async (request, { rejectWithValue }) => {
  try {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const data: CreateTeamResponse = await response.json();

    if (!data.success || !data.data) {
      return rejectWithValue(data.error || '创建团队失败');
    }

    return data.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '网络错误');
  }
});

// 更新团队
export const updateTeam = createAsyncThunk<
  Team,
  { teamId: string; request: UpdateTeamRequest },
  { rejectValue: string }
>('team/updateTeam', async ({ teamId, request }, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/teams/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const data: UpdateTeamResponse = await response.json();

    if (!data.success || !data.data) {
      return rejectWithValue(data.error || '更新团队失败');
    }

    return data.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '网络错误');
  }
});

// 删除团队
export const deleteTeam = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('team/deleteTeam', async (teamId, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/teams/${teamId}`, {
      method: 'DELETE',
    });
    const data: DeleteTeamResponse = await response.json();

    if (!data.success) {
      return rejectWithValue(data.error || '删除团队失败');
    }

    return teamId;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '网络错误');
  }
});


// ============ Async Thunks - 成员管理 ============

// 获取成员列表
export const fetchMembers = createAsyncThunk<
  MemberListResponse['data'],
  { teamId: string; query?: MemberListQuery },
  { rejectValue: string }
>('team/fetchMembers', async ({ teamId, query }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    if (query?.role) params.append('role', query.role);
    if (query?.search) params.append('search', query.search);

    const response = await fetch(`/api/teams/${teamId}/members?${params.toString()}`);
    const data: MemberListResponse = await response.json();

    if (!data.success || !data.data) {
      return rejectWithValue(data.error || '获取成员列表失败');
    }

    return data.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '网络错误');
  }
});

// 邀请成员
export const inviteMember = createAsyncThunk<
  TeamMember,
  { teamId: string; request: InviteMemberRequest },
  { rejectValue: string }
>('team/inviteMember', async ({ teamId, request }, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/teams/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const data: InviteMemberResponse = await response.json();

    if (!data.success || !data.data) {
      return rejectWithValue(data.error || '邀请成员失败');
    }

    return data.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '网络错误');
  }
});

// 更新成员角色
export const updateMemberRole = createAsyncThunk<
  TeamMember,
  { teamId: string; userId: string; request: UpdateMemberRoleRequest },
  { rejectValue: string }
>('team/updateMemberRole', async ({ teamId, userId, request }, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const data: UpdateMemberRoleResponse = await response.json();

    if (!data.success || !data.data) {
      return rejectWithValue(data.error || '更新成员角色失败');
    }

    return data.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '网络错误');
  }
});

// 移除成员
export const removeMember = createAsyncThunk<
  string,
  { teamId: string; userId: string },
  { rejectValue: string }
>('team/removeMember', async ({ teamId, userId }, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
    const data: RemoveMemberResponse = await response.json();

    if (!data.success) {
      return rejectWithValue(data.error || '移除成员失败');
    }

    return userId;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '网络错误');
  }
});


// ============ Async Thunks - 所有权转让和审计日志 ============

// 转让所有权
export const transferOwnership = createAsyncThunk<
  TransferOwnershipResponse['data'],
  { teamId: string; request: TransferOwnershipRequest },
  { rejectValue: string }
>('team/transferOwnership', async ({ teamId, request }, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/teams/${teamId}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const data: TransferOwnershipResponse = await response.json();

    if (!data.success || !data.data) {
      return rejectWithValue(data.error || '转让所有权失败');
    }

    return data.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '网络错误');
  }
});

// 获取审计日志
export const fetchAuditLogs = createAsyncThunk<
  AuditLogResponse['data'],
  { teamId: string; query?: AuditLogQuery },
  { rejectValue: string }
>('team/fetchAuditLogs', async ({ teamId, query }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    if (query?.start_date) params.append('start_date', query.start_date);
    if (query?.end_date) params.append('end_date', query.end_date);
    if (query?.action) params.append('action', query.action);
    if (query?.user_id) params.append('user_id', query.user_id);

    const response = await fetch(`/api/teams/${teamId}/audit-logs?${params.toString()}`);
    const data: AuditLogResponse = await response.json();

    if (!data.success || !data.data) {
      return rejectWithValue(data.error || '获取审计日志失败');
    }

    return data.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '网络错误');
  }
});

// 导出审计日志
export const exportAuditLogs = createAsyncThunk<
  AuditLogExportResponse['data'],
  { teamId: string; query?: Pick<AuditLogQuery, 'start_date' | 'end_date'> },
  { rejectValue: string }
>('team/exportAuditLogs', async ({ teamId, query }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams();
    if (query?.start_date) params.append('start_date', query.start_date);
    if (query?.end_date) params.append('end_date', query.end_date);

    const response = await fetch(`/api/teams/${teamId}/audit-logs/export?${params.toString()}`);
    const data: AuditLogExportResponse = await response.json();

    if (!data.success || !data.data) {
      return rejectWithValue(data.error || '导出审计日志失败');
    }

    return data.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '网络错误');
  }
});

export interface TeamWorkspaceSnapshot {
  teams: TeamListItem[];
  currentTeam: TeamDetail | null;
  members: TeamMember[];
  auditLogs: AuditLog[];
  invitations: TeamInvitation[];
}

// ============ Slice 定义 ============

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    // 清除错误
    clearError(state) {
      state.error = null;
    },
    // 清除当前团队
    clearCurrentTeam(state) {
      state.currentTeam = null;
      state.members = [];
      state.auditLogs = [];
      state.invitations = [];
    },
    // 重置状态
    resetTeamState() {
      return initialState;
    },
    // 设置当前团队
    setCurrentTeam(state, action: PayloadAction<TeamDetail | null>) {
      state.currentTeam = action.payload;
    },
    hydrateTeamWorkspace(state, action: PayloadAction<TeamWorkspaceSnapshot>) {
      state.loading = false;
      state.error = null;
      state.teams = action.payload.teams;
      state.currentTeam = action.payload.currentTeam;
      state.members = action.payload.members;
      state.auditLogs = action.payload.auditLogs;
      state.invitations = action.payload.invitations;
      state.pagination.teams.total = action.payload.teams.length;
      state.pagination.members.total = action.payload.members.length;
      state.pagination.auditLogs.total = action.payload.auditLogs.length;
    },
  },
  extraReducers: (builder) => {
    // ============ fetchTeams ============
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.teams = action.payload.items;
          state.pagination.teams = {
            page: action.payload.page,
            limit: action.payload.limit,
            total: action.payload.total,
            total_pages: action.payload.total_pages,
          };
        }
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || '获取团队列表失败';
      });

    // ============ fetchTeamDetail ============
    builder
      .addCase(fetchTeamDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTeam = action.payload;
      })
      .addCase(fetchTeamDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || '获取团队详情失败';
      });

    // ============ createTeam ============
    builder
      .addCase(createTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.loading = false;
        // 创建成功后，将新团队添加到列表（作为 owner）
        const newTeamItem: TeamListItem = {
          ...action.payload,
          member_count: 1,
          user_role: 'owner',
        };
        state.teams.unshift(newTeamItem);
        state.pagination.teams.total += 1;
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || '创建团队失败';
      });

    // ============ updateTeam ============
    builder
      .addCase(updateTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTeam.fulfilled, (state, action) => {
        state.loading = false;
        // 更新团队列表中的对应项
        const index = state.teams.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.teams[index] = { ...state.teams[index], ...action.payload };
        }
        // 更新当前团队
        if (state.currentTeam?.id === action.payload.id) {
          state.currentTeam = { ...state.currentTeam, ...action.payload };
        }
      })
      .addCase(updateTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || '更新团队失败';
      });

    // ============ deleteTeam ============
    builder
      .addCase(deleteTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = state.teams.filter((t) => t.id !== action.payload);
        state.pagination.teams.total -= 1;
        if (state.currentTeam?.id === action.payload) {
          state.currentTeam = null;
          state.members = [];
          state.auditLogs = [];
        }
      })
      .addCase(deleteTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || '删除团队失败';
      });


    // ============ fetchMembers ============
    builder
      .addCase(fetchMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.members = action.payload.items;
          state.pagination.members = {
            page: action.payload.page,
            limit: action.payload.limit,
            total: action.payload.total,
            total_pages: action.payload.total_pages,
          };
        }
      })
      .addCase(fetchMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || '获取成员列表失败';
      });

    // ============ inviteMember ============
    builder
      .addCase(inviteMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(inviteMember.fulfilled, (state, action) => {
        state.loading = false;
        state.members.push(action.payload);
        state.pagination.members.total += 1;
        // 更新团队成员数量
        if (state.currentTeam) {
          state.currentTeam.member_count += 1;
        }
        const teamIndex = state.teams.findIndex((t) => t.id === action.payload.team_id);
        if (teamIndex !== -1) {
          state.teams[teamIndex].member_count += 1;
        }
      })
      .addCase(inviteMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || '邀请成员失败';
      });

    // ============ updateMemberRole ============
    builder
      .addCase(updateMemberRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMemberRole.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.members.findIndex((m) => m.user_id === action.payload.user_id);
        if (index !== -1) {
          state.members[index] = action.payload;
        }
      })
      .addCase(updateMemberRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || '更新成员角色失败';
      });

    // ============ removeMember ============
    builder
      .addCase(removeMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        state.loading = false;
        const removedMember = state.members.find((m) => m.user_id === action.payload);
        state.members = state.members.filter((m) => m.user_id !== action.payload);
        state.pagination.members.total -= 1;
        // 更新团队成员数量
        if (state.currentTeam && removedMember) {
          state.currentTeam.member_count -= 1;
        }
        if (removedMember) {
          const teamIndex = state.teams.findIndex((t) => t.id === removedMember.team_id);
          if (teamIndex !== -1) {
            state.teams[teamIndex].member_count -= 1;
          }
        }
      })
      .addCase(removeMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || '移除成员失败';
      });


    // ============ transferOwnership ============
    builder
      .addCase(transferOwnership.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(transferOwnership.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const { old_owner, new_owner } = action.payload;
          // 更新成员列表中的角色
          const oldOwnerIndex = state.members.findIndex((m) => m.user_id === old_owner.user_id);
          if (oldOwnerIndex !== -1) {
            state.members[oldOwnerIndex] = old_owner;
          }
          const newOwnerIndex = state.members.findIndex((m) => m.user_id === new_owner.user_id);
          if (newOwnerIndex !== -1) {
            state.members[newOwnerIndex] = new_owner;
          }
          // 更新当前团队的 owner_id
          if (state.currentTeam) {
            state.currentTeam.owner_id = new_owner.user_id;
          }
        }
      })
      .addCase(transferOwnership.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || '转让所有权失败';
      });

    // ============ fetchAuditLogs ============
    builder
      .addCase(fetchAuditLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.auditLogs = action.payload.logs;
          state.pagination.auditLogs = {
            page: action.payload.page,
            limit: action.payload.limit,
            total: action.payload.total,
          };
        }
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || '获取审计日志失败';
      });

    // ============ exportAuditLogs ============
    builder
      .addCase(exportAuditLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportAuditLogs.fulfilled, (state) => {
        state.loading = false;
        // 导出成功，不需要更新状态，由调用方处理下载
      })
      .addCase(exportAuditLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || '导出审计日志失败';
      });
  },
});

// ============ 导出 ============

export const { clearError, clearCurrentTeam, resetTeamState, setCurrentTeam, hydrateTeamWorkspace } = teamSlice.actions;
export default teamSlice.reducer;
