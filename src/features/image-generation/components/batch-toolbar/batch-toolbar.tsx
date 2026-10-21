import { Button } from "@/ui";
import { VARIATIONS_TEXT } from "../../texts";

export interface BatchToolbarProps {
  onGenerate: () => void;
  loading: boolean;
  disabled: boolean;
}

export function BatchToolbar({
  onGenerate,
  loading,
  disabled,
}: BatchToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-title-lg text-text">{VARIATIONS_TEXT.title}</h2>
        <p className="text-caption text-text-muted">
          {VARIATIONS_TEXT.subtitle}
        </p>
      </div>
      <Button loading={loading} disabled={disabled} onClick={onGenerate}>
        {VARIATIONS_TEXT.generate}
      </Button>
    </div>
  );
}
