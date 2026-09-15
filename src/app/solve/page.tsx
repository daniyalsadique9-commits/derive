import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SolverApp } from "@/components/solver/SolverApp";
import { isAdminUser } from "@/lib/server/admin-auth";
import { signedInUser } from "@/lib/server/user-profile";

export const metadata: Metadata = { title: "Solve" };

export default async function SolvePage() {
  const user = await signedInUser();
  if (!user) redirect("/sign-in");

  return (
    <SolverApp
      userId={user.id}
      firstName={user.firstName ?? user.username ?? "there"}
      isAdmin={isAdminUser(user)}
    />
  );
}
