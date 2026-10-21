import { Suspense } from "react";
import { GeneratorScreen } from "@/features/image-generation/server";
import { DemoSessionGate } from "./demo-session-gate";

export default function ImageGeneratorPage(
  props: PageProps<"/image-generator">,
) {
  return (
    <Suspense>
      <DemoSessionGate
        path="/image-generator"
        searchParams={props.searchParams}
      >
        <GeneratorScreen variationsPath="/image-generator/batch" />
      </DemoSessionGate>
    </Suspense>
  );
}
