import { Link } from "react-router-dom";

export const LINKS_LOCAIS = [
  { to: "/termos-de-uso", label: "Termos de Uso" },
  { to: "/politica-de-privacidade", label: "Política de Privacidade" },
];

type LinksLegaisProps = {
  /** Caminho a omitir (ex.: a própria página, para não criar link para si mesma). */
  excluding?: string;
  className?: string;
};

/**
 * Links legais compartilhados. Usam <Link>, então abrem na mesma aba
 * e navegam dentro do app sem recarregar a página.
 */
export function LinksLegais({ excluding, className = "" }: LinksLegaisProps) {
  const links = LINKS_LOCAIS.filter((l) => l.to !== excluding);
  if (links.length === 0) return null;

  return (
    <nav
      aria-label="Links legais"
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground ${className}`}
    >
      {links.map((link, i) => (
        <span key={link.to} className="flex items-center gap-x-3">
          {i > 0 ? <span aria-hidden="true">•</span> : null}
          <Link
            to={link.to}
            className="underline underline-offset-2 transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

type FooterPublicoProps = {
  /** "bar" = barra larga com linha superior; "inline" = linha compacta no fim do conteúdo. */
  variant?: "bar" | "inline";
  /** Omitir a própria página, para não linkar para si mesma. */
  excluding?: string;
  /** Incluir razão social, CNPJ e cidade. */
  showCompany?: boolean;
  className?: string;
};

export function FooterPublico({
  variant = "bar",
  excluding,
  showCompany = false,
  className = "",
}: FooterPublicoProps) {
  if (variant === "inline") {
    return <LinksLegais excluding={excluding} className={className} />;
  }

  return (
    <footer className={`border-t border-border bg-card ${className}`}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-5 sm:px-6">
        <LinksLegais excluding={excluding} />
        {showCompany ? (
          <p className="text-center text-[11px] text-muted-foreground/80">
            SOFTPLUS TECNOLOGIA EM SISTEMAS LTDA · CNPJ 13.382.798/0001-25 · Natal/RN
          </p>
        ) : null}
      </div>
    </footer>
  );
}

export default FooterPublico;
