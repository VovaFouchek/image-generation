import { Suspense } from "react";
import { GeneratorScreen } from "@/features/image-generation/server";

// Screen 1. The tenant comes from the request (cookies), so the content renders per request
// inside Suspense (Cache Components).
export default function ImageGeneratorPage() {
  return (
    <Suspense>
      <GeneratorScreen variationsPath="/image-generator/batch" />
    </Suspense>
  );
}
