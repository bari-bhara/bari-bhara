import type { Photo } from "../queries";

/** Thumbnails that open the full photo. URLs are short-lived signed URLs. */
export function PhotoGallery({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) return null;
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Photos">
      {photos.map((photo, i) => (
        <li key={photo.id}>
          <a
            href={photo.url}
            target="_blank"
            rel="noreferrer"
            className="block aspect-square overflow-hidden rounded-md border bg-muted"
          >
            {/* Signed Storage URLs; next/image would need remote patterns for every project. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
          </a>
        </li>
      ))}
    </ul>
  );
}
