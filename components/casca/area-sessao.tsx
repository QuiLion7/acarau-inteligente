import Link from "next/link"

import { BotaoSair } from "@/components/casca/botao-sair"
import { buttonVariants } from "@/components/ui/button"
import { rotuloDoPapel, type SessaoValida } from "@/lib/auth/papeis"

// Mostra quem está na sessão, com o papel, e o acesso a sair; sem sessão, o acesso a entrar (RF-00.25).
export function AreaSessao({ sessao }: { sessao: SessaoValida | null }) {
  if (!sessao) {
    return (
      <Link
        href="/entrar"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Entrar
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">
        {sessao.nome} · {rotuloDoPapel(sessao.papel)}
      </span>
      <BotaoSair />
    </div>
  )
}
