import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function WatchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/watch");
  }

  return (
    <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full space-y-4">
      <h1 className="text-2xl font-bold">Watch Area (Protected)</h1>
      <p className="text-zinc-500">Welcome, {user.email}. This route is protected.</p>
    </main>
  );
}
