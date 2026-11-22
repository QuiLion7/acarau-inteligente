import { EstadoInterface } from "@/components/estados/estado-interface"

// Enquanto o servidor lê as obras e o território (react-next.md §12).
export default function CarregandoObras() {
  return <EstadoInterface tipo="carregando" titulo="Carregando as obras" />
}
