"use client"

import { useForm } from "@tanstack/react-form"
import Link from "next/link"
import { type Ref, useCallback, useImperativeHandle } from "react"

import {
  AvisoDoFormulario,
  CampoDeCategoria,
  CampoDeDescricao,
  CampoDeSituacao,
  CampoDeTexto,
  GrupoLocalizacao,
} from "@/components/obras/campos-obra"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { useSalvarObra } from "@/hooks/query/use-obras"
import { ApiError } from "@/lib/api/api-error"
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"
import {
  errosDoServidorPorCampo,
  valoresIniciaisDoFormulario,
  type CampoDoFormulario,
} from "@/lib/obras/formulario-obra"
import { lerPontoDigitado, localizarObra } from "@/lib/obras/localizacao-obra"
import { formatarCoordenada } from "@/lib/obras/valores-obra"
import type { Bairro } from "@/lib/territorio/artefato-schema"
import type { MultiPoligono } from "@/lib/territorio/geometria"
import {
  obraFormularioSchema,
  type Obra,
  type ObraFormulario,
  type PontoObra,
} from "@/lib/validations/obra-schema"

const { form: TEXTOS } = TEXTOS_OBRAS
const CAMPOS = TEXTOS.campos
const CAMINHO_LOGIN_EXPIRADO = `/entrar?motivo=expirada&retorno=${encodeURIComponent("/obras")}`

export type TerritorioDoFormulario = {
  limite: MultiPoligono
  bairros: readonly Pick<Bairro, "id" | "uv" | "nome" | "geometria">[]
}

/** O que o painel pode pedir ao formulário: o clique no mapa grava o ponto nos campos de coordenada. */
export type ControleDoFormObra = { definirPonto: (ponto: PontoObra) => void }

type FormObraProps = {
  ref?: Ref<ControleDoFormObra>
  /** `null` cadastra uma obra nova; uma obra abre a edição dela. */
  obra: Obra | null
  territorio: TerritorioDoFormulario
  onSalvo: (obra: Obra) => void
  onCancelar: () => void
  /** O ponto que as coordenadas formam agora (ou `null`), para o mapa desenhar o marcador provisório. */
  onPontoProvisorioChange: (ponto: PontoObra | null) => void
}

type LocalizacaoNoFormulario = {
  previa: string | null
  foraDoMunicipio: boolean
}

// Prévia do bairro antes de salvar (RF-04.18) e o bloqueio do ponto fora do município (RN-04.03).
function descreverLocalizacao(
  ponto: PontoObra | null,
  territorio: TerritorioDoFormulario
): LocalizacaoNoFormulario {
  const localizacao = localizarObra(ponto, territorio)
  if (localizacao.estado === "fora-do-limite") {
    return { previa: null, foraDoMunicipio: true }
  }
  if (localizacao.estado === "sem-localizacao") {
    return { previa: null, foraDoMunicipio: false }
  }
  const nome =
    localizacao.estado === "dentro-de-bairro"
      ? territorio.bairros.find(({ id }) => id === localizacao.bairroId)?.nome
      : TEXTOS_OBRAS.localizacao.foraDaCobertura
  return {
    previa: nome ? TEXTOS.localizacao.bairroCalculado(nome) : null,
    foraDoMunicipio: false,
  }
}

// Formulário de obra, criar e editar (RF-04.15 a RF-04.24). Fica na coluna ao lado do mapa, não num `Sheet`, para o
// clique no mapa funcionar (DV-44). O schema é o da rota; o ponto fora do município depende do território e por isso
// é conferido aqui com `localizarObra`, e o servidor confere de novo.
export function FormObra({
  ref,
  obra,
  territorio,
  onSalvo,
  onCancelar,
  onPontoProvisorioChange,
}: FormObraProps) {
  const salvar = useSalvarObra()
  const errosDoServidor = errosDoServidorPorCampo(salvar.error)
  const form = useForm({
    defaultValues: valoresIniciaisDoFormulario(obra),
    validators: { onSubmit: obraFormularioSchema },
    onSubmit: ({ value }) => handleEnviar(value),
  })
  // Foco no título ao abrir: a callback é estável, então roda só na montagem (sem `useEffect`, RNF-04.01).
  const focarAoMontar = useCallback(
    (titulo: HTMLElement | null) => titulo?.focus(),
    []
  )

  function handleEnviar(valores: ObraFormulario) {
    const ponto = lerPontoDigitado(valores.latitude, valores.longitude)
    if (descreverLocalizacao(ponto, territorio).foraDoMunicipio) return
    salvar.mutate(
      {
        obraId: obra?.id ?? null,
        entrada: obraFormularioSchema.parse(valores),
      },
      { onSuccess: onSalvo }
    )
  }

  // Regra entre dois campos no `superRefine`: o erro de envio fica no campo que o usuário não mexeu e bloquearia o
  // envio; mexer num campo limpa o do irmão (react-next §6).
  function limparErroDeEnvio(campo: CampoDoFormulario) {
    form.setFieldMeta(campo, (meta) => ({
      ...meta,
      errorMap: { ...meta.errorMap, onSubmit: undefined },
    }))
  }

  function handleCoordenada(campo: "latitude" | "longitude", valor: string) {
    const [latitude, longitude] =
      campo === "latitude"
        ? [valor, form.getFieldValue("longitude")]
        : [form.getFieldValue("latitude"), valor]
    onPontoProvisorioChange(lerPontoDigitado(latitude, longitude))
  }

  function gravarCoordenadas(latitude: string, longitude: string) {
    form.setFieldValue("latitude", latitude)
    form.setFieldValue("longitude", longitude)
    limparErroDeEnvio("latitude")
    limparErroDeEnvio("longitude")
  }

  function handleRemoverLocalizacao() {
    gravarCoordenadas("", "")
    onPontoProvisorioChange(null)
  }

  useImperativeHandle(ref, () => ({
    definirPonto: (ponto) => {
      gravarCoordenadas(
        formatarCoordenada(ponto.latitude),
        formatarCoordenada(ponto.longitude)
      )
      onPontoProvisorioChange(ponto)
    },
  }))

  const sessaoExpirada =
    salvar.error instanceof ApiError && salvar.error.code === "NAO_AUTENTICADO"
  const semMensagemPorCampo = Object.keys(errosDoServidor).length === 0
  const avisoGeral =
    salvar.isError && !sessaoExpirada && semMensagemPorCampo
      ? salvar.error.message
      : null

  return (
    <form
      noValidate
      aria-labelledby="titulo-form-obra"
      onSubmit={(evento) => {
        evento.preventDefault()
        void form.handleSubmit()
      }}
      className="flex flex-col gap-6"
    >
      <h3
        id="titulo-form-obra"
        tabIndex={-1}
        ref={focarAoMontar}
        className="text-lg font-semibold outline-none"
      >
        {obra ? TEXTOS.tituloEditar : TEXTOS.tituloNova}
      </h3>
      {sessaoExpirada ? (
        <AvisoDoFormulario>
          {TEXTOS.sessaoExpirada}{" "}
          <Link href={CAMINHO_LOGIN_EXPIRADO} className="font-medium underline">
            {TEXTOS.entrarDeNovo}
          </Link>
        </AvisoDoFormulario>
      ) : null}
      {avisoGeral ? <AvisoDoFormulario>{avisoGeral}</AvisoDoFormulario> : null}
      <FieldGroup>
        <form.Field name="titulo">
          {(campo) => (
            <CampoDeTexto
              campo={campo}
              rotulo={CAMPOS.titulo}
              erroDoServidor={errosDoServidor.titulo}
              autoComplete="off"
            />
          )}
        </form.Field>
        <form.Field name="situacao">
          {(campo) => (
            <CampoDeSituacao
              campo={campo}
              erroDoServidor={errosDoServidor.situacao}
            />
          )}
        </form.Field>
        <form.Field name="categoria">
          {(campo) => (
            <CampoDeCategoria
              campo={campo}
              erroDoServidor={errosDoServidor.categoria}
            />
          )}
        </form.Field>
        <form.Field name="secretaria">
          {(campo) => (
            <CampoDeTexto
              campo={campo}
              rotulo={CAMPOS.secretaria}
              erroDoServidor={errosDoServidor.secretaria}
              autoComplete="off"
            />
          )}
        </form.Field>
        <form.Field name="descricao">
          {(campo) => (
            <CampoDeDescricao
              campo={campo}
              erroDoServidor={errosDoServidor.descricao}
            />
          )}
        </form.Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field
            name="dataInicio"
            listeners={{ onChange: () => limparErroDeEnvio("dataPrevista") }}
          >
            {(campo) => (
              <CampoDeTexto
                campo={campo}
                rotulo={CAMPOS.dataInicio}
                type="date"
                erroDoServidor={errosDoServidor.dataInicio}
              />
            )}
          </form.Field>
          <form.Field name="dataPrevista">
            {(campo) => (
              <CampoDeTexto
                campo={campo}
                rotulo={CAMPOS.dataPrevista}
                type="date"
                erroDoServidor={errosDoServidor.dataPrevista}
              />
            )}
          </form.Field>
        </div>
        <form.Field name="valorPrevisto">
          {(campo) => (
            <CampoDeTexto
              campo={campo}
              rotulo={CAMPOS.valorPrevisto}
              inputMode="decimal"
              autoComplete="off"
              descricao={TEXTOS.valorDica}
              erroDoServidor={errosDoServidor.valorPrevisto}
            />
          )}
        </form.Field>
        <form.Subscribe
          selector={(estado) =>
            lerPontoDigitado(estado.values.latitude, estado.values.longitude)
          }
        >
          {(ponto) => {
            const { previa, foraDoMunicipio } = descreverLocalizacao(
              ponto,
              territorio
            )
            return (
              <GrupoLocalizacao
                previa={previa}
                erro={
                  foraDoMunicipio
                    ? TEXTOS_OBRAS.localizacao.foraDoMunicipio
                    : (errosDoServidor.localizacao ?? null)
                }
                remover={
                  <form.Subscribe
                    selector={(estado) =>
                      estado.values.latitude !== "" ||
                      estado.values.longitude !== ""
                    }
                  >
                    {(temCoordenada) =>
                      temCoordenada ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="self-start"
                          onClick={handleRemoverLocalizacao}
                        >
                          {TEXTOS.localizacao.remover}
                        </Button>
                      ) : null
                    }
                  </form.Subscribe>
                }
              >
                <form.Field
                  name="latitude"
                  listeners={{ onChange: () => limparErroDeEnvio("longitude") }}
                >
                  {(campo) => (
                    <CampoDeTexto
                      campo={campo}
                      rotulo={CAMPOS.latitude}
                      inputMode="decimal"
                      autoComplete="off"
                      aoMudar={(valor) => handleCoordenada("latitude", valor)}
                    />
                  )}
                </form.Field>
                <form.Field
                  name="longitude"
                  listeners={{ onChange: () => limparErroDeEnvio("latitude") }}
                >
                  {(campo) => (
                    <CampoDeTexto
                      campo={campo}
                      rotulo={CAMPOS.longitude}
                      inputMode="decimal"
                      autoComplete="off"
                      aoMudar={(valor) => handleCoordenada("longitude", valor)}
                    />
                  )}
                </form.Field>
              </GrupoLocalizacao>
            )
          }}
        </form.Subscribe>
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <form.Subscribe
          selector={(estado) => ({
            podeEnviar: estado.canSubmit,
            foraDoMunicipio: descreverLocalizacao(
              lerPontoDigitado(estado.values.latitude, estado.values.longitude),
              territorio
            ).foraDoMunicipio,
          })}
        >
          {({ podeEnviar, foraDoMunicipio }) => (
            <Button
              type="submit"
              disabled={!podeEnviar || foraDoMunicipio || salvar.isPending}
            >
              {salvar.isPending ? TEXTOS.salvando : TEXTOS.salvar}
            </Button>
          )}
        </form.Subscribe>
        <Button type="button" variant="outline" onClick={onCancelar}>
          {TEXTOS.cancelar}
        </Button>
      </div>
    </form>
  )
}
