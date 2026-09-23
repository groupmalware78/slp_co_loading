"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// swagger-ui-react touches the DOM directly and doesn't support SSR.
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function DocsPage() {
  return <SwaggerUI url="/api/docs/spec" />;
}
