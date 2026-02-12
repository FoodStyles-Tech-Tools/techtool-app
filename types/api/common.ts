export type ApiError = {
  error: string
  code?: string
  details?: string
}

export type CursorPage<T> = {
  data: T[]
  nextCursor: string | null
}
