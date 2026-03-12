export const STATUS_OPORTUNIDADE = {
  aberta: { label: "Aberta", className: "bg-blue-100 text-blue-700 border-blue-200" },
  ganha: { label: "Ganha", className: "bg-green-100 text-green-700 border-green-200" },
  perdida: { label: "Perdida", className: "bg-red-100 text-red-700 border-red-200" },
} as const;

export const ORIGENS = [
  "Indicação",
  "Site",
  "Redes Sociais",
  "Cold Call",
  "Evento",
  "Parceiro",
  "Outro",
];
