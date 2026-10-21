import { Suspense } from "react";
import { BatchScreen } from "@/features/image-generation/server";

// Screen 2: 15 variations of the example passed as ?from=.
export default function BatchPage(props: PageProps<"/image-generator/batch">) {
  return (
    <Suspense>
      <BatchScreen
        searchParams={props.searchParams}
        backPath="/image-generator"
      />
    </Suspense>
  );
}
