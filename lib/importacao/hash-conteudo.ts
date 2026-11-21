/**
 * SHA-256 dos bytes em hexadecimal minúsculo, o mesmo que o servidor grava (DEC-T-02). Serve só ao aviso "já
 * importado" no envio: sem `crypto.subtle` (contexto não seguro) devolve `null`, e quem decide continua sendo o
 * servidor na confirmação.
 */
export async function calcularHashConteudo(
  bytes: Uint8Array
): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return null
  const resumo = await subtle.digest("SHA-256", new Uint8Array(bytes))
  return Array.from(new Uint8Array(resumo), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}
