import { EstadoInterface } from "@/components/estados/estado-interface"
import type { Modulo } from "@/lib/config/modulos"

// Página de módulo ainda não entregue (RF-00.12, RN-00.06): só título e estado, nunca botão, gráfico ou número.
export function PaginaEmBreve({ modulo }: { modulo: Modulo }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {modulo.rotulo}
        </h1>
        <p className="text-muted-foreground">{modulo.descricao}</p>
      </header>
      <EstadoInterface tipo="em-breve" />
    </div>
  )
}
