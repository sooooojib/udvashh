import NextTopLoader from "nextjs-toploader";

export function TopProgressBar() {
  return (
    <NextTopLoader
      color="#3b82f6"
      initialPosition={0.08}
      crawlSpeed={200}
      height={3}
      crawl={true}
      showSpinner={false}
      easing="ease"
      speed={250}
      shadow="0 0 10px #3b82f6,0 0 5px #3b82f6"
      zIndex={99999}
      showAtBottom={false}
    />
  );
}
