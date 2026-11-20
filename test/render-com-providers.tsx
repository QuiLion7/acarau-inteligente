import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react"
import type { ReactElement } from "react"

// QueryClient novo por teste e sem retry (react-next.md §15): erro de mutation aparece na hora.
function criarQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

export function renderComProviders(
  ui: ReactElement,
  opcoes?: Omit<RenderOptions, "wrapper">
): RenderResult & { queryClient: QueryClient } {
  const queryClient = criarQueryClient()
  const resultado = render(ui, {
    ...opcoes,
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
  return { ...resultado, queryClient }
}
