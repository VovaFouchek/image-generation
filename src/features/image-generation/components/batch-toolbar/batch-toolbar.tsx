import { Button } from "@/ui";
import { SCREEN_2 } from "../copy";

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
        <h2 className="text-title-lg text-text">{SCREEN_2.title}</h2>
        <p className="text-caption text-text-muted">{SCREEN_2.subtitle}</p>
      </div>
      <Button loading={loading} disabled={disabled} onClick={onGenerate}>
        {SCREEN_2.generate}
      </Button>
    </div>
  );
}
