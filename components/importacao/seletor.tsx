import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel } from "@/components/ui/field"

type Opcao = { value: string; label: string }

type SeletorProps = {
  id: string
  rotulo: string
  /** `null` mostra o `placeholder`. */
  valor: string | null
  opcoes: readonly Opcao[]
  placeholder?: string
  onChange: (valor: string) => void
}

// Select do design system com rótulo visível ligado ao gatilho (acessível pelo nome).
export function Seletor({
  id,
  rotulo,
  valor,
  opcoes,
  placeholder,
  onChange,
}: SeletorProps) {
  return (
    <Field>
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
