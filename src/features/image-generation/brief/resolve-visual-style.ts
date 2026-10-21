import { toInlineData } from "../domain/inline-data";
import type { GenerationRequest } from "../domain/request";
import type { TenantKnowledge } from "../knowledge/types";
import type { VisualBrief } from "./types";

interface ResolvedVisualStyle {
  medium: string;
  style: string;
  lighting: string;
  composition: VisualBrief["composition"];
}

/** Photo defaults are a fallback, not mandatory rules for an explicitly chosen style. */
export function resolveVisualStyle(
  tenant: TenantKnowledge,
  request: GenerationRequest,
): ResolvedVisualStyle {
  if (request.style === "simple") {
    return {
      medium: tenant.photography.medium,
      style: `${tenant.photography.style}. Clean, uncluttered composition with one clear subject and generous calm space`,
      lighting: tenant.photography.lighting,
      composition: {
        shot: tenant.photography.shot,
        cameraAngle: tenant.photography.defaultCameraAngle,
        placement: tenant.photography.defaultPlacement,
      },
    };
  }

  const style =
    request.style === "abstract"
      ? "Abstract, non-literal visual metaphor built from shapes, textures and light"
      : `Style as requested by the user: "${toInlineData(request.styleNote ?? "", 200)}". Express this aesthetic visibly through shape language, detail density, materials, background treatment and subject arrangement; choose the rendering medium that fits it`;

  return {
    medium:
      request.style === "abstract"
        ? `an abstract image in the visual language of ${tenant.brandName}`
        : "an image in the user's selected visual style",
    style,
    lighting:
      "Use lighting, shading and contrast characteristic of the selected visual style, while respecting required brand rules",
    composition: {
      shot: "Choose framing, scale and depth that express the selected style and preserve the intended subject and message",
      cameraAngle: "from a viewpoint appropriate to the selected visual style",
      placement:
        "Let the selected style determine negative space, visual density and arrangement of the scene elements",
    },
  };
}
