const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"])

// Método inseguro só passa com `Origin` igual à origem de APP_URL (RF-00.30, DV-07).
export function origemPermitida(request: Request, appUrl: string): boolean {
  if (METODOS_SEGUROS.has(request.method.toUpperCase())) return true
  const origem = request.headers.get("origin")
  if (!origem) return false
  return origem === new URL(appUrl).origin
}
