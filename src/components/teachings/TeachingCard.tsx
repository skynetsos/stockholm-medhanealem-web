import { useLocale } from "next-intl";

import { Link } from "@/i18n/navigation";
import { fallbackLang } from "@/lib/lang";
import { richTextToPlain } from "@/lib/richtext";

import { FaithIcon } from "./FaithIcon";

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
/** `icon`: the centred icon card of the reference layout's Our Faith page (D-049). */
export function TeachingCard({
  title,
  href,
  body,
  heading = "h3",
  icon,
}: {
  title: string;
  href: string;
  body?: unknown;
  heading?: "h2" | "h3";
  icon?: string;
}) {
  const Heading = heading;
  const text = excerpt(body, icon ? 140 : EXCERPT_LENGTH);
  const locale = useLocale();
  if (icon) {
    return (
      <article className="flex h-full flex-col items-center gap-3 rounded-md border border-primary/15 bg-white p-6 text-center shadow-sm">
        <FaithIcon name={icon} />
        <Heading className="text-h4" lang={fallbackLang(title, locale)}>
          <Link href={href} className="no-underline hover:underline">
            {title}
          </Link>
        </Heading>
        {text && (
          <p className="text-muted" lang={fallbackLang(text, locale)}>
            {text}
          </p>
        )}
      </article>
    );
  }
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
