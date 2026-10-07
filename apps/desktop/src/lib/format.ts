/** Remove acentos e caixa para buscas ("Preferências" casa com "preferencias"). */
export const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
