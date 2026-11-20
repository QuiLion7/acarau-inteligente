import {
  caminhoInternoSeguro,
  destinoAposLogin,
} from "@/lib/auth/caminho-retorno"

describe("caminhoInternoSeguro", () => {
  it.each([
    "/",
    "/analista",
    "/analista?x=1",
    "/saude?bairro=Centro&periodo=2025",
    "/admin#topo",
  ])("aceita o caminho interno %s", (caminho) => {
    expect(caminhoInternoSeguro(caminho)).toBe(caminho)
  })

  it.each([
    ["URL absoluta", "https://exemplo.com"],
    ["URL sem esquema", "//exemplo.com"],
    ["barra invertida", "/\\exemplo.com"],
    ["barra invertida no meio", "/a\\b"],
    ["esquema javascript", "javascript:alert(1)"],
    ["caminho relativo", "analista"],
    ["tabulação que o navegador descarta", "/\t/exemplo.com"],
    ["quebra de linha", "/analista\nSet-Cookie: x=1"],
    ["vazio", ""],
  ])("recusa %s e volta para a raiz", (_descricao, valor) => {
    expect(caminhoInternoSeguro(valor)).toBe("/")
  })

  it.each([null, undefined])("recusa %s e volta para a raiz", (valor) => {
    expect(caminhoInternoSeguro(valor)).toBe("/")
  })
})

describe("destinoAposLogin", () => {
  it.each(["/analista", "/analista?aba=1", "/entrarx"])(
    "mantém o destino interno %s",
    (destino) => {
      expect(destinoAposLogin(destino)).toBe(destino)
    }
  )

  it.each(["/entrar", "/entrar?retorno=/analista", "/entrar/", "/entrar#x"])(
    "troca a própria página de login (%s) pela raiz, para não girar em laço",
    (destino) => {
      expect(destinoAposLogin(destino)).toBe("/")
    }
  )

  it.each(["https://exemplo.com", "//exemplo.com", "", null, undefined])(
    "recusa o destino externo ou ausente %p",
    (destino) => {
      expect(destinoAposLogin(destino)).toBe("/")
    }
  )
})
