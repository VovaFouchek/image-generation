import { Suspense } from "react";
import { GeneratorScreen } from "@/features/image-generation/server";

export default function ImageGeneratorPage() {
  return (
    <Suspense>
      <GeneratorScreen variationsPath="/image-generator/batch" />
    </Suspense>
  );
}
