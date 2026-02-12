export const queryKeys = {
  tickets: {
    list: (filtersHash: string) => ["tickets", "list", filtersHash] as const,
    detail: (ticketId: string) => ["tickets", "detail", ticketId] as const,
  },
  notifications: {
    list: (cursor: string | null) => ["notifications", "list", cursor] as const,
  },
  bootstrap: {
    user: (userId: string) => ["bootstrap", userId] as const,
  },
}
