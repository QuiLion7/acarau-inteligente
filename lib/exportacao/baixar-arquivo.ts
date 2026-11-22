// Entrega de um arquivo gerado no navegador (TechSpec EP-05 §2, RF-05.04, RF-05.18, RF-05.22): objeto URL e um `<a
// download>` clicado, revogado depois. Nada passa pelo servidor.

const REVOGAR_DEPOIS_DE_MS = 10_000

type Dependencias = {
  documento?: Pick<Document, "createElement" | "body">
  url?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">
  agendar?: (tarefa: () => void, depoisDeMs: number) => void
}

export function baixarBlob(
  blob: Blob,
  nome: string,
  {
    documento = document,
    url = URL,
    agendar = (tarefa, depoisDeMs) => void setTimeout(tarefa, depoisDeMs),
  }: Dependencias = {}
): void {
  const endereco = url.createObjectURL(blob)
  const ancora = documento.createElement("a")
  ancora.href = endereco
  ancora.download = nome
  ancora.rel = "noopener"
  ancora.style.display = "none"
  documento.body.append(ancora)
  ancora.click()
  ancora.remove()
  // O navegador precisa de um instante para iniciar o download antes de o objeto URL sumir.
  agendar(() => url.revokeObjectURL(endereco), REVOGAR_DEPOIS_DE_MS)
}
