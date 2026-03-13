export type AssetOwnerDto = {
  id: string
  name: string | null
  email: string
}

export type AssetCollaboratorDto = {
  id: string
  name: string | null
  email: string
  image: string | null
}

export type AssetDto = {
  id: string
  name: string
  description: string | null
  links: string[]
  production_url: string | null
  owner: AssetOwnerDto | null
  owner_id: string
  collaborator_ids: string[]
  collaborators: AssetCollaboratorDto[]
  created_at: string
}
