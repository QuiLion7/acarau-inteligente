import { versaoDaApp } from "@/lib/config/versao-app"
import pacote from "@/package.json"

describe("versaoDaApp (RF-05.07)", () => {
  it("junta a versão do pacote ao commit curto da publicação", () => {
    expect(
      versaoDaApp({ VERCEL_GIT_COMMIT_SHA: "a1b2c3d4e5f6a7b8" }, "0.5.0")
    ).toBe("0.5.0+a1b2c3d")
  })

  it.each([undefined, "", "   "])(
    "sem commit (%p) a versão termina em +local",
    (commit) => {
      expect(versaoDaApp({ VERCEL_GIT_COMMIT_SHA: commit }, "0.5.0")).toBe(
        "0.5.0+local"
      )
    }
  )

  it("usa a versão do package.json por padrão", () => {
    expect(versaoDaApp({})).toBe(`${pacote.version}+local`)
  })
})
