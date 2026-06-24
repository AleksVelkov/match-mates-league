import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMe } from "@/api/auth";

export const Route = createFileRoute("/_protected")({
  beforeLoad: async () => {
    const me = await getMe();
    if (!me) throw redirect({ to: "/login" });
    return { me };
  },
  component: Outlet,
});
