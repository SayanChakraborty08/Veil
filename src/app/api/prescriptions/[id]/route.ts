import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { getMedicalContract } from "@/lib/web3"
import { ethers } from "ethers"

const routeContextSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
})

// Helper function to fetch prescription from blockchain
async function fetchPrescriptionFromBlockchain(prescriptionId: string, userAddress?: string) {
  try {
    const contract = await getMedicalContract(false) // Read-only access
    
    // Convert string ID to number for blockchain lookup
    const blockchainId = parseInt(prescriptionId)
    if (isNaN(blockchainId)) {
      return null
    }

    // Get prescription data from blockchain
    const prescriptionData = await contract.prescriptions(blockchainId)
    
    if (!prescriptionData || prescriptionData.id === BigInt(0)) {
      return null
    }

    // Get doctor and patient info
    const doctorInfo = await contract.doctors(prescriptionData.doctorAddress)
    const patientInfo = await contract.patients(prescriptionData.patientAddress)

    // Check if user has access to this prescription
    if (userAddress) {
      const hasAccess = prescriptionData.doctorAddress.toLowerCase() === userAddress.toLowerCase() ||
                       prescriptionData.patientAddress.toLowerCase() === userAddress.toLowerCase()
      if (!hasAccess) {
        return null
      }
    }

    // Get medications array (need to call a separate method if it exists)
    // For now, we'll return basic prescription info
    const medications = [] // We'll need to implement getting medications from blockchain

    return {
      id: prescriptionData.id.toString(),
      issueDate: new Date(Number(prescriptionData.issueDate) * 1000).toISOString(),
      validTill: new Date(Number(prescriptionData.issueDate) * 1000 + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days validity
      notes: "", // Not stored on current blockchain contract
      patient: {
        user: {
          name: patientInfo.name || "Unknown Patient"
        }
      },
      doctor: {
        user: {
          name: doctorInfo.name || "Unknown Doctor"
        },
        specialization: doctorInfo.speciality || "",
        licenseNumber: "" // Not stored on current blockchain contract
      },
      medications: medications,
      blockchainOnly: true // Flag to indicate this is from blockchain
    }
  } catch (error) {
    console.error("Error fetching prescription from blockchain:", error)
    return null
  }
}

// GET - Fetch specific prescription details
export async function GET(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    const { params } = routeContextSchema.parse(context)
    const prescriptionId = params.id

    // Get user's role to determine access permissions
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    // Get user's wallet address (blockId) based on role
    let userWalletAddress: string | undefined
    let prescription

    if (userData?.role === "doctor") {
      // Doctor can only see their own prescriptions
      const doctor = await db.doctor.findFirst({
        where: { userId: user.id },
        select: { id: true, blockId: true }
      })
      userWalletAddress = doctor?.blockId

      if (!doctor) {
        return new Response("Doctor not found", { status: 404 })
      }

      prescription = await db.prescription.findFirst({
        where: { 
          id: prescriptionId,
          doctorId: doctor.id 
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
    } else {
      // Patient can only see their own prescriptions
      const patient = await db.patient.findFirst({
        where: { userId: user.id },
        select: { id: true, blockId: true }
      })
      userWalletAddress = patient?.blockId

      if (!patient) {
        // If no patient ID found in database, try blockchain lookup
        console.log("No patient ID found for database storage - trying blockchain lookup")
        
        if (userWalletAddress) {
          prescription = await fetchPrescriptionFromBlockchain(prescriptionId, userWalletAddress)
          
          if (prescription) {
            return new Response(JSON.stringify(prescription), {
              headers: { "Content-Type": "application/json" }
            })
          }
        }
        
        return new Response("Patient not found and no blockchain data available", { status: 404 })
      }

      prescription = await db.prescription.findFirst({
        where: { 
          id: prescriptionId,
          patientId: patient.id 
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
    }

    if (!prescription) {
      // If prescription not found in database, try blockchain
      console.log("Prescription not found in database - trying blockchain lookup")
      
      if (userWalletAddress) {
        prescription = await fetchPrescriptionFromBlockchain(prescriptionId, userWalletAddress)
        
        if (prescription) {
          return new Response(JSON.stringify(prescription), {
            headers: { "Content-Type": "application/json" }
          })
        }
      }
      
      return new Response("Prescription not found", { status: 404 })
    }

    return new Response(JSON.stringify(prescription), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Error fetching prescription details:", error)
    return new Response(
      JSON.stringify({ error: "Failed to fetch prescription details" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}

// PUT - Update prescription (for status updates, etc.)
export async function PUT(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    const { params } = routeContextSchema.parse(context)
    const prescriptionId = params.id

    // Only doctors can update prescriptions
    const doctor = await db.doctor.findFirst({
      where: { userId: user.id },
      select: { id: true }
    })

    if (!doctor) {
      return new Response("Only doctors can update prescriptions", { status: 403 })
    }

    const json = await req.json()
    
    // Check if prescription belongs to this doctor
    const existingPrescription = await db.prescription.findFirst({
      where: { 
        id: prescriptionId,
        doctorId: doctor.id 
      }
    })

    if (!existingPrescription) {
      return new Response("Prescription not found or access denied", { status: 404 })
    }

    // Update prescription
    const updatedPrescription = await db.prescription.update({
      where: { id: prescriptionId },
      data: json,
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

    return new Response(JSON.stringify(updatedPrescription), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Error updating prescription:", error)
    return new Response(
      JSON.stringify({ error: "Failed to update prescription" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}
