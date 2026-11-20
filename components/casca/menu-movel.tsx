"use client"

import { MenuIcon } from "lucide-react"
import { Suspense, useState } from "react"

import { MenuModulos } from "@/components/casca/menu-modulos"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { Papel } from "@/lib/auth/papeis"

// Abaixo de md o menu dos módulos vira um painel lateral aberto por botão (RF-00.18).
export function MenuMovel({ papel }: { papel?: Papel }) {
  const [aberto, setAberto] = useState(false)

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label="Abrir menu"
            className="md:hidden"
          />
        }
      >
        <MenuIcon aria-hidden />
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Módulos da demonstração.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <Suspense fallback={null}>
            <MenuModulos
              papel={papel}
              orientacao="vertical"
              onNavegar={() => setAberto(false)}
            />
          </Suspense>
        </div>
      </SheetContent>
    </Sheet>
  )
}
