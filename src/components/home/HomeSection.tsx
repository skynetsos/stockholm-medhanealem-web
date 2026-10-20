import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";

/** A home page section: landmark labelled by its heading, inside the site width, with an optional "see all" link. */
export function HomeSection({
  id,
  title,
  children,
  className = "",
  more,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
  more?: { href: string; label: string } | null;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={`mx-auto max-w-site px-gutter py-10 ${className}`}>
      <h2 id={`${id}-title`} className="mb-4">
        {title}
      </h2>
      {children}
      {more && (
        <p className="mt-4">
          <Link href={more.href} className="inline-flex min-h-11 items-center font-medium">
            {more.label}
          </Link>
        </p>
      )}
    </section>
  );
}
