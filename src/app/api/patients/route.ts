import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Only doctors can access patient data
    const doctor = await db.doctor.findFirst({
      where: { userId: user.id },
      select: { id: true }
    })

    if (!doctor) {
      return new Response("Only doctors can access patient data", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const address = searchParams.get("address")

    if (address) {
      // Look up patient by wallet address
      const patients = await db.patient.findMany({
        where: { blockId: address },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      })
      return new Response(JSON.stringify(patients), {
        headers: { "Content-Type": "application/json" }
      })
    } else {
      // Return all patients
      const patients = await db.patient.findMany({
        include: {
          user: {
            select: { name: true, email: true }
          }
        },
        orderBy: { user: { name: 'asc' } }
      })
      return new Response(JSON.stringify(patients), {
        headers: { "Content-Type": "application/json" }
      })
    }
  } catch (error) {
    console.error("Error fetching patients:", error)
    return new Response(
      JSON.stringify({ error: "Failed to fetch patients" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}
