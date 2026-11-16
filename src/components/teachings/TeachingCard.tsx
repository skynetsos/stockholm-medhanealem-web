import { useLocale } from "next-intl";

import { Link } from "@/i18n/navigation";
import { fallbackLang } from "@/lib/lang";
import { richTextToPlain } from "@/lib/richtext";

const EXCERPT_LENGTH = 180;

/** Short plain-text start of a rich text body, cut at a word. */
export function excerpt(body: unknown, length = EXCERPT_LENGTH): string {
  const text = richTextToPlain(body);
  if (text.length <= length) return text;
  const cut = text.lastIndexOf(" ", length);
  return `${text.slice(0, cut > 0 ? cut : length).trimEnd()}…`;
}

/** Title (the link) and the first lines of a teaching (spec §5 TeachingCard). */
/** `heading`: h3 under a section heading (default), h2 when the cards follow the page title directly. */
export function TeachingCard({ title, href, body, heading = "h3" }: { title: string; href: string; body?: unknown; heading?: "h2" | "h3" }) {
  const Heading = heading;
  const text = excerpt(body);
  const locale = useLocale();
  return (
    <article className="h-full rounded border-t-4 border-gold bg-white p-4 shadow-sm">
      <Heading className="text-h4" lang={fallbackLang(title, locale)}>
        <Link href={href} className="no-underline hover:underline">
          {title}
        </Link>
      </Heading>
      {text && (
        <p className="mt-2 text-muted" lang={fallbackLang(text, locale)}>
          {text}
        </p>
      )}
    </article>
  );
}
