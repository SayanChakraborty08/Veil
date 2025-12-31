import { getServerSession } from "next-auth/next"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { getMedicalContract } from "@/lib/web3"

// Validation schema for prescription creation
const prescriptionCreateSchema = z.object({
  patientId: z.string().min(1),
  medications: z.array(z.object({
    name: z.string().min(1),
    dosage: z.string().min(1),
    duration: z.string().min(1),
    additionalInstructions: z.string().optional(),
  })),
  validTill: z.string().datetime().optional(),
  blockchainTxHash: z.string().optional(),
})

// Helper function to fetch all prescriptions from blockchain for a user
async function fetchAllPrescriptionsFromBlockchain(userAddress?: string, isDoctor: boolean = false) {
  try {
    const contract = await getMedicalContract(false) // Read-only access
    
    // Get the total number of prescriptions
    const prescriptionCounter = await contract.prescriptionCounter()
    const prescriptions: any[] = []

    // Iterate through all prescriptions (starting from 1, as 0 is usually invalid)
    for (let i = 1; i <= Number(prescriptionCounter); i++) {
      try {
        const prescriptionData = await contract.prescriptions(i)
        
        if (!prescriptionData || prescriptionData.id === BigInt(0)) {
          continue
        }

        let hasAccess = false;
        if (userAddress) {
          // Check if user has access to this prescription
          hasAccess = prescriptionData.doctorAddress.toLowerCase() === userAddress.toLowerCase() ||
                           prescriptionData.patientAddress.toLowerCase() === userAddress.toLowerCase()
          
          // For doctors, only include prescriptions they issued
          // For patients, only include prescriptions for them
          if (isDoctor && prescriptionData.doctorAddress.toLowerCase() !== userAddress.toLowerCase()) {
            continue
          }
          if (!isDoctor && prescriptionData.patientAddress.toLowerCase() !== userAddress.toLowerCase()) {
            continue
          }
        } else {
          // If no userAddress is provided, grant access to all prescriptions.
          hasAccess = true;
        }


        if (hasAccess) {
          // Get doctor and patient info
          const [doctorInfo, patientInfo] = await Promise.all([
            contract.doctors(prescriptionData.doctorAddress),
            contract.patients(prescriptionData.patientAddress)
          ])

          prescriptions.push({
            id: prescriptionData.id.toString(),
            issueDate: new Date(Number(prescriptionData.issueDate) * 1000).toISOString(),
            validTill: new Date(Number(prescriptionData.issueDate) * 1000 + 30 * 24 * 60 * 60 * 1000).toISOString(),
            notes: "", // Not stored on current blockchain contract
            patient: {
              user: {
                name: patientInfo.name || "Unknown Patient",
                email: "" // Not stored on blockchain
              }
            },
            doctor: {
              user: {
                name: doctorInfo.name || "Unknown Doctor",
                email: "" // Not stored on blockchain
              },
              specialization: doctorInfo.speciality || "",
              licenseNumber: "" // Not stored on current blockchain contract
            },
            medications: [], // Will be empty for now as medications aren't stored separately on blockchain
            blockchainOnly: true // Flag to indicate this is from blockchain
          })
        }
      } catch (error) {
        console.error(`Error fetching prescription ${i} from blockchain:`, error)
        // Continue with next prescription
      }
    }

    return prescriptions
  } catch (error) {
    console.error("Error fetching prescriptions from blockchain:", error)
    return []
  }
}

// GET - Fetch prescriptions for the current user
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role") || "patient" // Default to patient

    let prescriptions

    if (role === "doctor") {
      // Get prescriptions issued by this doctor
      const doctor = await db.doctor.findFirst({
        where: { userId: user.id },
        select: { id: true, blockId: true }
      })

      if (!doctor) {
        return new Response("Doctor not found", { status: 404 })
      }

      // Get prescriptions from database
      const dbPrescriptions = await db.prescription.findMany({
        where: { doctorId: doctor.id },
        include: {
          medications: true,
          patient: {
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          },
          doctor: {
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          }
        },
        orderBy: { issueDate: 'desc' }
      })

      // Get prescriptions from blockchain if doctor has blockId
      let blockchainPrescriptions: any[] = []
      if (doctor.blockId) {
        blockchainPrescriptions = await fetchAllPrescriptionsFromBlockchain(doctor.blockId, true)
      }

      // Combine database and blockchain prescriptions, removing duplicates
      const combined = new Map()
      dbPrescriptions.forEach(p => combined.set(p.id, p))
      blockchainPrescriptions.forEach(p => {
        // Avoid adding if a DB version with the same ID (from tx hash) exists
        if (!combined.has(p.id)) {
          combined.set(p.id, p)
        }
      })
      prescriptions = Array.from(combined.values())

    } else {
      // PATIENT LOGIC
      const userWalletAddress = (user as any).address // Address from session is the source of truth

      // if (!userWalletAddress) {
      //   return new Response("User has no blockchain address connected.", { status: 400 })
      // }

      // Find patient record in DB
      const patient = await db.patient.findFirst({
        where: { userId: user.id },
        select: { id: true },
      })

      let dbPrescriptions: any[] = []
      if (patient) {
        dbPrescriptions = await db.prescription.findMany({
          where: { patientId: patient.id },
          include: {
            medications: true,
            patient: { include: { user: { select: { name: true, email: true } } } },
            doctor: { include: { user: { select: { name: true, email: true } } } },
          },
          orderBy: { issueDate: 'desc' },
        })
      }

      // Get prescriptions from blockchain using the session address
      const blockchainPrescriptions = await fetchAllPrescriptionsFromBlockchain()

      // Combine database and blockchain prescriptions, removing duplicates
      const combined = new Map()
      dbPrescriptions.forEach(p => combined.set(p.id, p))
      blockchainPrescriptions.forEach(p => {
        if (!combined.has(p.id)) {
          combined.set(p.id, p)
        }
      })
      prescriptions = Array.from(combined.values())
    }

    // Sort all prescriptions by issue date (most recent first)
    prescriptions.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())

    return new Response(JSON.stringify(prescriptions), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Error fetching prescriptions:", error)
    return new Response(
      JSON.stringify({ error: "Failed to fetch prescriptions" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}

// POST - Create a new prescription
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Only doctors can create prescriptions
    const doctor = await db.doctor.findFirst({
      where: { userId: user.id },
      select: { id: true }
    })

    if (!doctor) {
      return new Response("Only doctors can create prescriptions", { status: 403 })
    }

    const json = await req.json()
    const body = prescriptionCreateSchema.parse(json)

    // Calculate valid till date (default to 30 days from now if not provided)
    const validTill = body.validTill 
      ? new Date(body.validTill)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Create prescription with medications in database
    const prescription = await db.prescription.create({
      data: {
        doctorId: doctor.id,
        patientId: body.patientId,
        validTill: validTill,
        medications: {
          create: body.medications.map(med => ({
            name: med.name,
            dosage: med.dosage,
            duration: med.duration,
            additionalInstructions: med.additionalInstructions || "",
          }))
        }
      },
      include: {
        medications: true,
        patient: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        doctor: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
      }
    })

    return new Response(JSON.stringify(prescription), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Error creating prescription:", error)
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { 
        status: 422,
        headers: { "Content-Type": "application/json" }
      })
    }

    return new Response(
      JSON.stringify({ error: "Failed to create prescription" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}
