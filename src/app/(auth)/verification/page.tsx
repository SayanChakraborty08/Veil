import { redirect } from "next/navigation"

import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

import RegistrationOptionsSection from "./select-role"

export default async function Component() {
  const user = await getCurrentUser()
  if (!user || !user.id) return redirect("/login")

  // Check if user already has a role set
  const userWithRole = await db.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      role: true,
    },
  })

  // If user already has a role set, redirect them to their appropriate dashboard
  if (userWithRole?.role && userWithRole.role !== "unset") {
    if (userWithRole.role === "doctor") {
      return redirect("/doctor")
    } else if (userWithRole.role === "patient") {
      return redirect("/dashboard")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <RegistrationOptionsSection />
    </div>
  )
}
