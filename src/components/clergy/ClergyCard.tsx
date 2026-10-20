import Image from "next/image";

import { CmsRichText } from "@/components/richtext/CmsRichText";
import { mediaSource, publicMedia } from "@/lib/media";
import type { Clergy } from "@/payload-types";

/** Photo, title and name; the full bio on the Clergy page (spec §5 ClergyCard). */
export function ClergyCard({ person, withBio = false }: { person: Clergy; withBio?: boolean }) {
  const photo = publicMedia(person.photo);
  const source = photo ? mediaSource(photo, 400) : null;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded bg-white shadow-sm">
      {photo && source && (
        <Image
          src={source.url}
          width={source.width}
          height={source.height}
          alt={photo.alt}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="aspect-[4/5] h-auto w-full object-cover"
        />
      )}
      <div className="p-4">
        {person.title && <p className="text-sm font-semibold text-muted">{person.title}</p>}
        <h3 className="text-h4">{person.name}</h3>
        {withBio && <CmsRichText data={person.bio} className="mt-3" />}
      </div>
    </article>
  );
}
