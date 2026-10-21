import { ImagePlaceholderIcon } from "@/ui";
import { VARIATIONS_TEXT } from "../../texts";

export function BatchEmptyState() {
  const { title, description } = VARIATIONS_TEXT.empty;

  return (
    <section
      aria-label={title}
      lang="en"
      className="flex min-h-80 w-full max-w-2xl flex-col items-center justify-center gap-4 rounded-button bg-placeholder px-6 py-12 text-center border-placeholder-dashed"
    >
      <ImagePlaceholderIcon />
      <div className="flex max-w-lg flex-col gap-2">
        <h3 className="text-title text-text">{title}</h3>
        <p className="text-body text-text-muted">{description}</p>
      </div>
    </section>
  );
}
