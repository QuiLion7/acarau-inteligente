import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type OpcaoDoSeletor = { value: string; label: string }

type SeletorSaudeProps = {
  id: string
  rotulo: string
  valor: string | null
  opcoes: readonly OpcaoDoSeletor[]
  placeholder?: string
  onChange: (valor: string) => void
}

// Select do design system com rótulo visível ligado ao gatilho, para o período e a versão.
export function SeletorSaude({
  id,
  rotulo,
  valor,
  opcoes,
  placeholder,
  onChange,
}: SeletorSaudeProps) {
  return (
    <Field className="w-full sm:w-64">
      <FieldLabel id={`${id}-rotulo`}>{rotulo}</FieldLabel>
      <Select
        value={valor}
        onValueChange={(novo) => novo !== null && onChange(novo)}
        items={opcoes}
      >
        <SelectTrigger
          id={id}
          aria-labelledby={`${id}-rotulo`}
          className="w-full"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
