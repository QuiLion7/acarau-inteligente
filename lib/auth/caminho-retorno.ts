const CARACTERE_DE_CONTROLE = /[\u0000-\u001f\u007f]/

// Destino de redirecionamento vindo da URL só passa se for caminho interno (RF-00.28, seguranca.md §5).
// Controles e "\" são recusados porque o navegador os descarta ou os trata como "/" ("/\x" e "/\t/x" viram "//x").
export function caminhoInternoSeguro(valor: string | null | undefined): string {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//")) return "/"
  if (valor.includes("\\") || CARACTERE_DE_CONTROLE.test(valor)) return "/"
  return valor
}

const CAMINHO_DO_LOGIN = /^\/entrar(?:[/?#]|$)/

// Destino depois do login: caminho interno e nunca a própria página de login (a página já logada
// redireciona ao destino, então apontar para ela seria um laço).
export function destinoAposLogin(valor: string | null | undefined): string {
  const seguro = caminhoInternoSeguro(valor)
  return CAMINHO_DO_LOGIN.test(seguro) ? "/" : seguro
}
