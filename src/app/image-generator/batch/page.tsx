import { Suspense } from "react";
import { BatchScreen } from "@/features/image-generation/server";

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
