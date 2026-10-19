import type { ReactNode } from "react";

/** A home page section: landmark labelled by its heading, inside the site width. */
export function HomeSection({
  id,
  title,
  children,
  className = "",
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={`mx-auto max-w-site px-gutter py-10 ${className}`}>
      <h2 id={`${id}-title`} className="mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}
