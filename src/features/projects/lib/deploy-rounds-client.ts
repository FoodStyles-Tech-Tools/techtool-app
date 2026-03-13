import { requestJson } from "@client/lib/api"
import type { DeployRound, DeployRoundChecklistItem } from "@shared/types"

type RawDeployRound = {
  id: string
  projectId: string
  name: string
  checklist: DeployRoundChecklistItem[]
  createdAt: string
  updatedAt: string
  hasTickets?: boolean
}

export type DeployRoundWithMeta = DeployRound & {
  hasTickets: boolean
}

type DeployRoundsResponse = {
  deployRounds: RawDeployRound[]
}

type DeployRoundResponse = {
  deployRound: RawDeployRound
}

export async function fetchDeployRounds(projectId: string): Promise<DeployRoundWithMeta[]> {
  const response = await requestJson<DeployRoundsResponse>(
    `/api/v2/projects/${projectId}/deploy-rounds`
  )

  return (response.deployRounds || []).map((dr) => ({
    id: dr.id,
    projectId: dr.projectId,
    name: dr.name,
    checklist: dr.checklist,
    createdAt: dr.createdAt,
    updatedAt: dr.updatedAt,
    hasTickets: dr.hasTickets ?? false,
  }))
}

export async function createDeployRound(
  projectId: string,
  payload: {
    name: string
    checklist?: DeployRoundChecklistItem[]
  }
): Promise<DeployRoundWithMeta> {
  const response = await requestJson<DeployRoundResponse>(
    `/api/v2/projects/${projectId}/deploy-rounds`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  return {
    id: response.deployRound.id,
    projectId: response.deployRound.projectId,
    name: response.deployRound.name,
    checklist: response.deployRound.checklist,
    createdAt: response.deployRound.createdAt,
    updatedAt: response.deployRound.updatedAt,
    hasTickets: response.deployRound.hasTickets ?? false,
  }
}

export async function updateDeployRound(
  projectId: string,
  deployRoundId: string,
  payload: {
    name?: string
    checklist?: DeployRoundChecklistItem[]
  }
): Promise<DeployRoundWithMeta> {
  const response = await requestJson<DeployRoundResponse>(
    `/api/v2/projects/${projectId}/deploy-rounds/${deployRoundId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  return {
    id: response.deployRound.id,
    projectId: response.deployRound.projectId,
    name: response.deployRound.name,
    checklist: response.deployRound.checklist,
    createdAt: response.deployRound.createdAt,
    updatedAt: response.deployRound.updatedAt,
    hasTickets: response.deployRound.hasTickets ?? false,
  }
}

export async function deleteDeployRound(
  projectId: string,
  deployRoundId: string
): Promise<{ success: boolean }> {
  await requestJson<{ success: boolean }>(
    `/api/v2/projects/${projectId}/deploy-rounds/${deployRoundId}`,
    {
      method: "DELETE",
    }
  )

  return { success: true }
}
