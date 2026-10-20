import type {
  SerializedAutoLinkNode,
  SerializedHeadingNode,
  SerializedLinkNode,
  SerializedUploadNode,
} from "@payloadcms/richtext-lexical";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { type JSXConverter, type JSXConvertersFunction, RichText } from "@payloadcms/richtext-lexical/react";
import { getLocale } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";

import { mediaSource, publicMedia } from "@/lib/media";
import { hasRichText, richTextLinkHref } from "@/lib/richtext";
import type { Media } from "@/payload-types";

/**
 * CMS rich text for the public site:
 * - links: internal ones to published pages only, in the visitor's language; unsafe URLs dropped
 * - images: only those with publication permission (others render nothing)
 * - an editor's "Heading 1" becomes h2, since the page title is the only h1
 */
export async function CmsRichText({ data, className = "" }: { data: unknown; className?: string }) {
  if (!hasRichText(data)) return null;
  const locale = await getLocale();

  const link: JSXConverter<SerializedLinkNode | SerializedAutoLinkNode> = ({ node, nodesToJSX }) => {
    const children = nodesToJSX({ nodes: node.children });
    const href = richTextLinkHref(node.fields as Parameters<typeof richTextLinkHref>[0], locale);
    if (!href) return <>{children}</>;
    const tab = node.fields.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
    return href.startsWith("/") ? (
      <Link href={href} {...tab}>
        {children}
      </Link>
    ) : (
      <a href={href} {...tab}>
        {children}
      </a>
    );
  };

  const heading: JSXConverter<SerializedHeadingNode> = ({ node, nodesToJSX }) => {
    const Tag = node.tag === "h1" ? "h2" : node.tag;
    return <Tag>{nodesToJSX({ nodes: node.children })}</Tag>;
  };

  const upload: JSXConverter<SerializedUploadNode> = ({ node }) => {
    const media = publicMedia(node.value as Media | number | null);
    if (!media || !media.mimeType?.startsWith("image/")) return null;
    const source = mediaSource(media, 800);
    return (
      <figure>
        <Image
          src={source.url}
          width={source.width}
          height={source.height}
          alt={media.alt}
          sizes="(min-width: 768px) 48rem, 100vw"
          className="h-auto w-full rounded"
        />
        {media.caption && <figcaption className="mt-2 text-sm text-muted">{media.caption}</figcaption>}
      </figure>
    );
  };

  const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    link,
    autolink: link,
    heading,
    upload,
  });

  return <RichText data={data as SerializedEditorState} converters={converters} className={`rich-text ${className}`} />;
}
