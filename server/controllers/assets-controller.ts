import type { Request, Response } from "express"
import { getRequestContext } from "@/lib/auth-helpers"
import { handleControllerError } from "@/server/http/handle-controller-error"
import * as assetsService from "@/server/services/assets-service"
import {
  parseAssetIdParams,
  parseCreateAssetBody,
  parseUpdateAssetBody,
} from "@/server/validation/assets"

export async function listAssetsController(_request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "assets", action: "view" },
    })
    const payload = await assetsService.listAssets(context)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/assets")
  }
}

export async function createAssetController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "assets", action: "create" },
    })
    const payload = await assetsService.createAsset(context, parseCreateAssetBody(request.body))
    response.status(201).json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/assets")
  }
}

export async function updateAssetController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "assets", action: "edit" },
    })
    const { id } = parseAssetIdParams(request.params)
    const payload = await assetsService.updateAsset(context, id, parseUpdateAssetBody(request.body))
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/assets/:id")
  }
}

export async function deleteAssetController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "assets", action: "delete" },
    })
    const { id } = parseAssetIdParams(request.params)
    const payload = await assetsService.deleteAsset(context, id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in DELETE /api/assets/:id")
  }
}
