import { ICONES_ESCOLA } from "./estilo-mapa"
import { desenharHachuraSemDados, desenharIconeEscola } from "./imagens-mapa"

function pixelsOpacos({ data }: { data: Uint8Array }) {
  return data.filter((valor, indice) => indice % 4 === 3 && valor === 255)
    .length
}

describe("desenharIconeEscola", () => {
  const icones = Object.values(ICONES_ESCOLA).map(desenharIconeEscola)

  it("gera uma imagem RGBA 24x24 por estado, com fundo transparente e miolo opaco", () => {
    for (const { width, height, data } of icones) {
      expect(width * height * 4).toBe(data.length)
      expect(data[3]).toBe(0)
      const meio = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4
      expect(data[meio + 3]).toBe(255)
    }
  })

  it("os três ícones são diferentes entre si (forma e cor, não só cor)", () => {
    const [circulo, quadrado, triangulo] = icones.map(({ data }) =>
      Buffer.from(data).toString("base64")
    )

    expect(new Set([circulo, quadrado, triangulo]).size).toBe(3)
  })

  it("as formas ocupam áreas diferentes: o quadrado é o maior e o triângulo, o menor", () => {
    const [circulo, quadrado, triangulo] = icones.map(pixelsOpacos)

    expect(quadrado).toBeGreaterThan(circulo!)
    expect(circulo).toBeGreaterThan(triangulo!)
  })

  it("o miolo usa a cor do estado e o contorno é branco", () => {
    const { data } = desenharIconeEscola(ICONES_ESCOLA["fora-do-limite"])
    const rgbEm = (linha: number, coluna: number) => {
      const inicio = (linha * 24 + coluna) * 4
      return [...data.slice(inicio, inicio + 3)]
    }

    expect(rgbEm(12, 12)).toEqual([0xb9, 0x1c, 0x1c])
    expect(rgbEm(21, 12)).toEqual([255, 255, 255])
  })
})

describe("desenharHachuraSemDados", () => {
  it("é uma imagem quadrada com listras diagonais cinza e fundo transparente", () => {
    const { width, height, data } = desenharHachuraSemDados()

    expect(data).toHaveLength(width * height * 4)
    expect(width).toBe(height)
    const opacos = pixelsOpacos({ data })
    expect(opacos).toBeGreaterThan(0)
    expect(opacos).toBeLessThan(width * height)
  })
})
