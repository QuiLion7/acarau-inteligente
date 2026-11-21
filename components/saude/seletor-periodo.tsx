import { SeletorSaude } from "@/components/saude/seletor-saude"

type SeletorPeriodoProps = {
  periodos: readonly string[]
  /** `null` quando o período da URL não existe no dataset: nada fica marcado. */
  periodo: string | null
  onChange: (periodo: string) => void
}

// Períodos do dataset, ligados ao filtro global `periodo` da URL (RF-02.30).
export function SeletorPeriodo({
  periodos,
  periodo,
  onChange,
}: SeletorPeriodoProps) {
  return (
    <SeletorSaude
      id="seletor-periodo"
      rotulo="Período"
      valor={periodo}
      opcoes={periodos.map((valor) => ({ value: valor, label: valor }))}
      placeholder="Escolha um período"
      onChange={onChange}
    />
  )
}
