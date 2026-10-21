import { Suspense } from "react";
import { BatchScreen } from "@/features/image-generation/server";
import { DemoSessionGate } from "../demo-session-gate";

export default function BatchPage(props: PageProps<"/image-generator/batch">) {
  return (
    <Suspense>
      <DemoSessionGate
        path="/image-generator/batch"
        searchParams={props.searchParams}
      >
        <BatchScreen
          searchParams={props.searchParams}
          backPath="/image-generator"
        />
      </DemoSessionGate>
    </Suspense>
  );
}
