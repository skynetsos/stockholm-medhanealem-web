import type { Locale } from "next-intl";
import Image from "next/image";
import { Fragment, type ReactNode } from "react";

import { ClergyCard } from "@/components/clergy/ClergyCard";
import { EventCard } from "@/components/events/EventCard";
import { CmsLink } from "@/components/layout/CmsLink";
import { GalleryGrid } from "@/components/media/GalleryGrid";
import { VideoEmbed } from "@/components/media/VideoEmbed";
import { CmsRichText } from "@/components/richtext/CmsRichText";
import { getPublishedClergy } from "@/lib/cms/clergy";
import { getActiveEvents } from "@/lib/cms/events";
import { getLayoutData } from "@/lib/cms/layout";
import { getDateLabels } from "@/lib/date-labels";
import { upcomingOccurrences } from "@/lib/home";
import { isRenderableLink } from "@/lib/links";
import { galleryItems, mediaSource, publicMedia } from "@/lib/media";
import { hasRichText } from "@/lib/richtext";
import { parseVideoUrl } from "@/lib/video";
import type { Page } from "@/payload-types";

type Block = NonNullable<Page["layout"]>[number];
type BlockOf<T extends Block["blockType"]> = Extract<Block, { blockType: T }>;

// w-full: blocks sit in a flex column, where auto margins would otherwise shrink them to their content.
const narrow = "mx-auto w-full max-w-3xl px-gutter";
const wide = "mx-auto w-full max-w-site px-gutter";

function Heading({ text }: { text?: string | null }) {
  return text ? <h2 className="mb-4">{text}</h2> : null;
}

function RichTextBlock({ block }: { block: BlockOf<"richText"> }) {
  return (
    <div className={narrow}>
      <CmsRichText data={block.content} />
    </div>
  );
}

function TwoColumnBlock({ block }: { block: BlockOf<"twoColumn"> }) {
  const image = publicMedia(block.image);
  const source = image ? mediaSource(image, 800) : null;
  const right = hasRichText(block.right) ? (
    <CmsRichText data={block.right} />
  ) : image && source ? (
    <Image src={source.url} width={source.width} height={source.height} alt={image.alt} sizes="(min-width: 768px) 50vw, 100vw" className="h-auto w-full rounded" />
  ) : null;
  return (
    <div className={`${wide} grid items-start gap-8 md:grid-cols-2`}>
      <div className={right && block.imagePosition === "left" && !hasRichText(block.right) ? "md:order-2" : ""}>
        <CmsRichText data={block.left} />
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

function ImageGalleryBlock({ block }: { block: BlockOf<"imageGallery"> }) {
  const images = galleryItems(block.images);
  if (!images.length) return null;
  return (
    <div className={wide}>
      <Heading text={block.heading} />
      <GalleryGrid images={images} />
    </div>
  );
}

function CallToActionBlock({ block }: { block: BlockOf<"callToAction"> }) {
  const links = (block.links ?? []).filter(isRenderableLink);
  return (
    <div className={wide}>
      <div className="on-dark rounded bg-primary p-6 text-cream md:p-10">
        <h2 className="text-cream">{block.heading}</h2>
        {block.text && <p className="mt-2 max-w-2xl whitespace-pre-line">{block.text}</p>}
        {links.length > 0 && (
          <ul className="mt-5 flex flex-col gap-3 sm:flex-row">
            {links.map((item) => (
              <li key={item.id}>
                <CmsLink
                  link={item.link}
                  className={`flex min-h-11 items-center justify-center rounded px-5 font-medium no-underline ${
                    item.style === "secondary" ? "border-2 border-cream text-cream hover:bg-cream hover:text-primary" : "bg-gold text-ink hover:bg-cream"
                  }`}
                >
                  {item.label}
                </CmsLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FaqBlock({ block }: { block: BlockOf<"faq"> }) {
  const items = (block.items ?? []).filter((item) => item.question?.trim());
  if (!items.length) return null;
  return (
    <div className={narrow}>
      <Heading text={block.heading} />
      <div className="divide-y divide-cream rounded bg-white shadow-sm">
        {items.map((item) => (
          <details key={item.id} className="group p-4">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-primary">{item.question}</summary>
            <CmsRichText data={item.answer} className="mt-2" />
          </details>
        ))}
      </div>
    </div>
  );
}

async function ClergyGridBlock({ block, locale }: { block: BlockOf<"clergyGrid">; locale: Locale }) {
  const clergy = (await getPublishedClergy(locale)).slice(0, block.limit ?? undefined);
  if (!clergy.length) return null;
  return (
    <div className={wide}>
      <Heading text={block.heading} />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {clergy.map((person) => (
          <li key={person.id}>
            <ClergyCard person={person} />
          </li>
        ))}
      </ul>
    </div>
  );
}

async function EventListBlock({ block, locale }: { block: BlockOf<"eventList">; locale: Locale }) {
  const [events, labels, { settings }] = await Promise.all([getActiveEvents(locale), getDateLabels(), getLayoutData(locale)]);
  const items = upcomingOccurrences(events, new Date(), { types: block.types, limit: block.limit ?? 5 });
  if (!items.length) return null;
  return (
    <div className={wide}>
      <Heading text={block.heading} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((o) => (
          <li key={`${o.event.id}-${o.start}`}>
            <EventCard occurrence={o} labels={labels} defaultLocation={settings.defaultLocation} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function VideoEmbedBlock({ block }: { block: BlockOf<"videoEmbed"> }) {
  const video = parseVideoUrl(block.url);
  if (!video) return null;
  return (
    <div className={narrow}>
      <VideoEmbed video={video} title={block.title} caption={block.caption} />
    </div>
  );
}

/** Page layout blocks (spec §2.2); a block with nothing to show renders nothing. */
export function RenderBlocks({ blocks, locale }: { blocks: Page["layout"]; locale: Locale }) {
  const render = (block: Block): ReactNode => {
    switch (block.blockType) {
      case "richText":
        return <RichTextBlock block={block} />;
      case "twoColumn":
        return <TwoColumnBlock block={block} />;
      case "imageGallery":
        return <ImageGalleryBlock block={block} />;
      case "callToAction":
        return <CallToActionBlock block={block} />;
      case "faq":
        return <FaqBlock block={block} />;
      case "clergyGrid":
        return <ClergyGridBlock block={block} locale={locale} />;
      case "eventList":
        return <EventListBlock block={block} locale={locale} />;
      case "videoEmbed":
        return <VideoEmbedBlock block={block} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-12 py-10">
      {(blocks ?? []).map((block, i) => (
        <Fragment key={block.id ?? i}>{render(block)}</Fragment>
      ))}
    </div>
  );
}
