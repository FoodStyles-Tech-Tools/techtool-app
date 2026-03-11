import { sanitizeLinkArray } from "@shared/links"
import type { Asset } from "./domain"
import type { AssetDto } from "./api/assets"

/** Normalize an API AssetDto to the domain Asset type. */
export function normalizeAsset(dto: AssetDto): Asset {
  return {
    ...dto,
    links: sanitizeLinkArray(dto.links),
    collaborator_ids: Array.isArray(dto.collaborator_ids) ? dto.collaborator_ids : [],
    collaborators: Array.isArray(dto.collaborators) ? dto.collaborators : [],
  }
}
