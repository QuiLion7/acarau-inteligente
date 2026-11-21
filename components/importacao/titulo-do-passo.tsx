import type { ReactNode } from "react"

// Módulo-level de propósito: com identidade estável o React só chama o ref na montagem, então o foco vai ao
// título quando o passo aparece e não a cada render.
function focarElemento(titulo: HTMLHeadingElement | null) {
  titulo?.focus()
}

type TituloDoPassoProps = {
  children: ReactNode
  /** Falso na abertura da página: o primeiro foco é o do "pular para o conteúdo". */
  focar: boolean
}

// Quem usa só teclado ou leitor de tela perde o ponto ao trocar de passo; o foco vai ao título dele (CA-02.34).
export function TituloDoPasso({ children, focar }: TituloDoPassoProps) {
  return (
    <h2
      ref={focar ? focarElemento : undefined}
      tabIndex={-1}
      className="rounded-sm text-xl font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {children}
    </h2>
  )
}
