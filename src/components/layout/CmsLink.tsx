import type { ReactNode } from "react";

import type { LinkValue } from "@/fields/link";
import { Link } from "@/i18n/navigation";
import { resolveLink } from "@/lib/links";

type Props = {
  link: LinkValue | null | undefined;
  className?: string;
  children: ReactNode;
};

/** Renders a CMS link: internal paths get the visitor's locale prefix; invalid links render nothing. */
export function CmsLink({ link, className, children }: Props) {
  const resolved = resolveLink(link);
  if (!resolved) return null;
  const tab = resolved.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};

  if (resolved.kind === "external") {
    return (
      <a href={resolved.href} className={className} {...tab}>
        {children}
      </a>
    );
  }
  return (
    <Link href={resolved.href} className={className} {...tab}>
      {children}
    </Link>
  );
}
