import { useQueryClient } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"

import { QueryProvider } from "@/components/providers/query-provider"

function MostraPadroes() {
  const opcoes = useQueryClient().getDefaultOptions()
  return (
    <p>
      {String(opcoes.queries?.staleTime)}|{String(opcoes.mutations?.retry)}
    </p>
  )
}

describe("QueryProvider", () => {
  it("provê um QueryClient com staleTime de 30 s e sem retry em mutation", () => {
    render(
      <QueryProvider>
        <MostraPadroes />
      </QueryProvider>
    )

    expect(screen.getByText("30000|false")).toBeInTheDocument()
  })
})
