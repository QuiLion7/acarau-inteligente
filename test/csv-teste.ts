// Apoio dos testes de componente que exportam CSV: o Blob do jsdom não tem `text()`/`arrayBuffer()`, então a leitura
// passa pelo FileReader. O leitor de texto descarta o BOM; os bytes iniciais se conferem à parte.

export function lerTextoDoBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result as string)
    leitor.readAsText(blob, "utf-8")
  })
}

export async function linhasDoCsvBaixado(blob: Blob): Promise<string[]> {
  return (await lerTextoDoBlob(blob)).split("\r\n").slice(0, -1)
}
