import { Link } from "@/i18n/navigation";
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
export function TeachingCard({ title, href, body }: { title: string; href: string; body?: unknown }) {
  const text = excerpt(body);
  return (
    <article className="h-full rounded border-t-4 border-gold bg-white p-4 shadow-sm">
      <h3 className="text-h4">
        <Link href={href} className="no-underline hover:underline">
          {title}
        </Link>
      </h3>
      {text && <p className="mt-2 text-muted">{text}</p>}
    </article>
  );
}
