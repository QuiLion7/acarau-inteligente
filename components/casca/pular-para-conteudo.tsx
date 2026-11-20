// Primeiro foco da página (RF-00.17): fica fora da tela até receber foco por teclado.
export function PularParaConteudo() {
  return (
    <a
      href="#conteudo"
      className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-primary-foreground"
    >
      Pular para o conteúdo
    </a>
  )
}
