// Erro de uma chamada ao próprio app: `code` e `message` vêm do envelope do servidor (DV-08);
// quando a resposta não segue o envelope, o http-client monta um código local.
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: Record<string, unknown>
  readonly requestId?: string

  constructor(
    code: string,
    message: string,
    opcoes: {
      status?: number
      details?: Record<string, unknown>
      requestId?: string
      cause?: unknown
    } = {}
  ) {
    super(message, { cause: opcoes.cause })
    this.name = "ApiError"
    this.code = code
    this.status = opcoes.status ?? 0
    this.details = opcoes.details
    this.requestId = opcoes.requestId
  }
}
