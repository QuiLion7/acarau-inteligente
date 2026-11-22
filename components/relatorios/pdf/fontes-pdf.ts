import { Font } from "@react-pdf/renderer"

import { FAMILIA } from "@/components/relatorios/pdf/estilos-pdf"

let registrada = false

const TAMANHO_DO_LOTE = 0x8000

// A fonte é baixada aqui, como bytes, e registrada como `data:` URL: o react-pdf guarda a fonte que falhou ao baixar como
// falha permanente, então deixar a rede por conta dele faria "Tentar de novo" (CA-05.08) nunca funcionar depois de uma
// queda no download. Aqui o registro só acontece com as duas fontes em mãos; falhou, nada fica registrado e a próxima
// tentativa baixa de novo.
async function baixarComoDataUrl(url: string): Promise<string> {
  const resposta = await fetch(url)
  if (!resposta.ok) throw new Error(`Fonte indisponível (${resposta.status})`)
  const bytes = new Uint8Array(await resposta.arrayBuffer())
  let binario = ""
  for (let inicio = 0; inicio < bytes.length; inicio += TAMANHO_DO_LOTE) {
    binario += String.fromCharCode(
      ...bytes.subarray(inicio, inicio + TAMANHO_DO_LOTE)
    )
  }
  return `data:font/ttf;base64,${btoa(binario)}`
}

// A Roboto (a mesma família da tela) vai embutida no PDF, com os acentos do português; os arquivos ficam em `public/fontes`
// e só baixam no primeiro clique em "Gerar PDF" (R-02). Sem hifenização: o texto quebra só nos espaços.
export async function registrarFontes(
  origem: string = window.location.origin
): Promise<void> {
  if (registrada) return
  const [regular, negrito] = await Promise.all([
    baixarComoDataUrl(`${origem}/fontes/Roboto-Regular.ttf`),
    baixarComoDataUrl(`${origem}/fontes/Roboto-Bold.ttf`),
  ])
  Font.register({
    family: FAMILIA,
    fonts: [
      { src: regular, fontWeight: "normal" },
      { src: negrito, fontWeight: "bold" },
    ],
  })
  Font.registerHyphenationCallback((palavra) => [palavra])
  registrada = true
}
