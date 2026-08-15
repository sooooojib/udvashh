import { redirect } from "next/navigation";

export default function WatchIndex() {
  // /watch without a videoId should go to the dashboard
  redirect("/dashboard");
}
