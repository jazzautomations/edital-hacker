import { Suspense } from "react";
import SignClient from "./SignClient";

export default function Page({ params }: { params: Promise<{ link: string }> }) {
  return (
    <>
      <meta name="robots" content="noindex" />
      <title>Assinar documento · Manager</title>
      <Suspense fallback={<main className="mx-auto w-full max-w-2xl px-4 py-12" aria-busy="true" />}>
        <SignClient params={params} />
      </Suspense>
    </>
  );
}
