"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchDeployRounds,
  createDeployRound as createDeployRoundApi,
  updateDeployRound as updateDeployRoundApi,
  deleteDeployRound as deleteDeployRoundApi,
  type DeployRoundWithMeta,
} from "@client/features/projects/lib/deploy-rounds-client"
import type { DeployRoundChecklistItem } from "@shared/types"

const deployRoundQueryKeys = {
  all: () => ["deploy-rounds"] as const,
  byProject: (projectId: string) => ["deploy-rounds", "project", projectId] as const,
}

export function useDeployRounds(projectId: string, options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false

  return useQuery({
    queryKey: deployRoundQueryKeys.byProject(projectId),
    queryFn: () => fetchDeployRounds(projectId),
    enabled: enabled && !!projectId,
    staleTime: 30 * 1000,
  })
}

export function useCreateDeployRound() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      name,
      checklist,
    }: {
      projectId: string
      name: string
      checklist?: DeployRoundChecklistItem[]
    }) => {
      return createDeployRoundApi(projectId, { name, checklist })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: deployRoundQueryKeys.byProject(variables.projectId) })
    },
  })
}

export function useUpdateDeployRound() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      deployRoundId,
      name,
      checklist,
    }: {
      projectId: string
      deployRoundId: string
      name?: string
      checklist?: DeployRoundChecklistItem[]
    }) => {
      return updateDeployRoundApi(projectId, deployRoundId, { name, checklist })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: deployRoundQueryKeys.byProject(variables.projectId) })
    },
  })
}

export function useDeleteDeployRound() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      deployRoundId,
    }: {
      projectId: string
      deployRoundId: string
    }) => {
      return deleteDeployRoundApi(projectId, deployRoundId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: deployRoundQueryKeys.byProject(variables.projectId) })
    },
  })
}
