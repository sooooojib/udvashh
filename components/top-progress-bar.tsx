"use client";

import { AppProgressBar as ProgressBar } from "next-nprogress-bar";

export function TopProgressBar() {
  return (
    <ProgressBar
      height="3px"
      color="#3b82f6"
      options={{ showSpinner: false, easing: "ease", speed: 400 }}
      shallowRouting
    />
  );
}
