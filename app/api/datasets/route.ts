import { NextResponse } from "next/server"

import { listarDatasets } from "@/lib/server/datasets/dataset-repositorio"
import { obterBanco } from "@/lib/server/db/cliente"
import { rotaApi } from "@/lib/server/http/rota-api"

// Lista de datasets com versões (RF-02.25): só analista ou acima. O visitante vê a Saúde pelo Server Component, nunca
// por esta rota (DV-17, CA-02.18).
export const GET = rotaApi(
  async () =>
    NextResponse.json({ datasets: await listarDatasets(obterBanco()) }),
  { papel: "analista" }
)
