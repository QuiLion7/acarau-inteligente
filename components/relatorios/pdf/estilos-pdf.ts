import { StyleSheet } from "@react-pdf/renderer"

// Estilos do PDF (A4). Cores em hexadecimal: o PDF não lê tokens do tema nem variáveis CSS (react-next.md §11 não se
// aplica ao PDF, TechSpec §12). Tamanhos em pontos.
export const FAMILIA = "Roboto"

export const CORES_PDF = {
  texto: "#111827",
  suave: "#4b5563",
  linha: "#d1d5db",
  fundoCabecalho: "#eef2f7",
  aviso: "#fef9c3",
  marcaDagua: "#9ca3af",
} as const

export const estilos = StyleSheet.create({
  pagina: {
    fontFamily: FAMILIA,
    fontSize: 9.5,
    color: CORES_PDF.texto,
    paddingTop: 36,
    paddingBottom: 54,
    paddingHorizontal: 36,
  },
  // O `lineHeight` fica no corpo, não na página: herdado pelos textos fixos do rodapé ele os faz sumir (o número da
  // página não é desenhado), um comportamento do react-pdf com texto dinâmico.
  corpo: { lineHeight: 1.35 },
  titulo: { fontSize: 17, fontWeight: "bold", marginBottom: 6 },
  secao: { marginTop: 18 },
  h2: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: CORES_PDF.linha,
  },
  h3: { fontSize: 11, fontWeight: "bold", marginTop: 10, marginBottom: 4 },
  paragrafo: { marginBottom: 4 },
  suave: { color: CORES_PDF.suave },
  negrito: { fontWeight: "bold" },
  aviso: {
    backgroundColor: CORES_PDF.aviso,
    borderWidth: 1,
    borderColor: CORES_PDF.linha,
    padding: 6,
    marginBottom: 6,
    borderRadius: 3,
  },
  dados: { flexDirection: "row", marginBottom: 1.5 },
  dadosRotulo: { width: 120, fontWeight: "bold" },
  dadosValor: { flex: 1 },
  cartoes: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  cartao: {
    width: "48%",
    marginRight: "2%",
    marginBottom: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: CORES_PDF.linha,
    borderRadius: 3,
  },
  cartaoTitulo: { fontSize: 9, fontWeight: "bold", marginBottom: 2 },
  cartaoValor: { fontSize: 15, fontWeight: "bold", marginBottom: 2 },
  tabela: { marginBottom: 8, borderWidth: 1, borderColor: CORES_PDF.linha },
  tabelaCabecalho: {
    flexDirection: "row",
    backgroundColor: CORES_PDF.fundoCabecalho,
    borderBottomWidth: 1,
    borderBottomColor: CORES_PDF.linha,
  },
  tabelaLinha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: CORES_PDF.linha,
  },
  celula: { paddingVertical: 2.5, paddingHorizontal: 4 },
  celulaCabecalho: { fontWeight: "bold" },
  item: { flexDirection: "row", marginBottom: 1.5 },
  marcador: { width: 10 },
  itemTexto: { flex: 1 },
  amostra: {
    width: 9,
    height: 9,
    borderWidth: 0.8,
    borderColor: CORES_PDF.texto,
    marginRight: 5,
    marginTop: 1.5,
  },
  imagem: { alignSelf: "center", marginVertical: 4 },
  marcaDagua: {
    position: "absolute",
    top: 330,
    left: 20,
    width: 560,
    textAlign: "center",
    fontSize: 78,
    fontWeight: "bold",
    color: CORES_PDF.marcaDagua,
    opacity: 0.18,
    transform: "rotate(-32deg)",
  },
  rodapeTexto: {
    position: "absolute",
    bottom: 24,
    left: 36,
    width: 400,
    fontSize: 8,
    color: CORES_PDF.suave,
  },
  // Texto dinâmico absoluto precisa de `left` e `right` (ou `width`): sem isso a caixa nasce com largura zero no primeiro
  // layout, quando o texto ainda é vazio, e o número da página não aparece.
  rodapePagina: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    textAlign: "right",
    fontSize: 8,
    color: CORES_PDF.suave,
  },
})
