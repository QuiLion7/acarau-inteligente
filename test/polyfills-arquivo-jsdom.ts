// O jsdom não traz `TextEncoder`, `TextDecoder`, `crypto.subtle` nem `Blob.arrayBuffer`, que o navegador tem e o
// assistente de importação usa. Importe este arquivo antes de qualquer outro nos testes de interface do assistente.
import { webcrypto } from "node:crypto"
import { TextDecoder, TextEncoder } from "node:util"

Object.assign(globalThis, { TextDecoder, TextEncoder })

// `crypto.subtle` existe no navegador (SHA-256 do arquivo no envio) e não no jsdom.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto })
}

if (typeof Blob.prototype.arrayBuffer !== "function") {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob) {
    return new Promise<ArrayBuffer>((resolver, rejeitar) => {
      const leitor = new FileReader()
      leitor.onload = () => resolver(leitor.result as ArrayBuffer)
      leitor.onerror = () => rejeitar(leitor.error)
      leitor.readAsArrayBuffer(this)
    })
  }
}

// O Base UI cria `PointerEvent` ao clicar em radio e checkbox; o jsdom ainda não o implementa.
if (
  typeof MouseEvent !== "undefined" &&
  typeof globalThis.PointerEvent === "undefined"
) {
  Object.defineProperty(globalThis, "PointerEvent", { value: MouseEvent })
}
