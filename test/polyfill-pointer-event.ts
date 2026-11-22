// O jsdom não tem `PointerEvent`, que o Base UI usa para disparar o clique de botão, chip e rádio. Um `MouseEvent`
// com o mesmo nome basta: os testes de comportamento só precisam que o clique chegue ao componente.
if (typeof window !== "undefined" && !("PointerEvent" in window)) {
  Object.defineProperty(window, "PointerEvent", {
    value: class PointerEvent extends MouseEvent {},
    configurable: true,
  })
}
