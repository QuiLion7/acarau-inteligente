import { requisitar } from "@/lib/api/http-client"
import {
  obraSchema,
  type Obra,
  type ObraEntrada,
} from "@/lib/validations/obra-schema"

// Só chama os handlers de escrita de obras do próprio app (TechSpec EP-04 §5); a leitura é do Server Component
// (DV-42). A resposta é validada na chegada.
export const obrasClient = {
  async criar(entrada: ObraEntrada): Promise<Obra> {
    const resposta = await requisitar("/api/obras", {
      metodo: "POST",
      corpo: entrada,
    })
    return obraSchema.parse(await resposta.json())
  },
  async editar(obraId: string, entrada: ObraEntrada): Promise<Obra> {
    const resposta = await requisitar(
      `/api/obras/${encodeURIComponent(obraId)}`,
      { metodo: "PUT", corpo: entrada }
    )
    return obraSchema.parse(await resposta.json())
  },
}
