"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Shield, Calendar, Stethoscope, CheckCircle, AlertCircle } from "lucide-react"

import { getMedicalWithZKContract, getZKVerifierContract } from "@/lib/web3"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

interface Medication {
  name: string
  dosage: string
  duration: string
  additionalInstructions: string
}

interface AnonymousPrescriptionDetail {
  id: number
  doctorAddress: string
  issueDate: Date
  diagnosis: string
  medications: Medication[]
  isVerified: boolean
  zkId: number
  commitment: string[]
}

export default function AnonymousPrescriptionDetailPage() {
  const { id } = useParams()
  const [prescription, setPrescription] = useState<AnonymousPrescriptionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (id) {
      fetchPrescriptionDetails()
    }
  }, [id])

  const fetchPrescriptionDetails = async () => {
    try {
      const medicalContract = await getMedicalWithZKContract()
      const zkVerifierContract = await getZKVerifierContract()

      // Get prescription details
      const details = await medicalContract.getPrescriptionDetails(Number(id))
      const zkId = await medicalContract.prescriptionToZKId(Number(id))
      
      // Get medications
      const prescriptionData = await medicalContract.prescriptions(Number(id))
      const medications = prescriptionData.medications.map((med: any) => ({
        name: med.name,
        dosage: med.dosage,
        duration: med.duration.toString(),
        additionalInstructions: med.additionalInstructions,
      }))

      // Get ZK verification details
      let isVerified = false
      let commitment: string[] = []
      try {
        isVerified = await zkVerifierContract.verifyAnonymousPrescription(Number(zkId))
        const zkDetails = await zkVerifierContract.getAnonymousPrescription(Number(zkId))
        commitment = zkDetails[0].map((c: bigint) => c.toString())
      } catch (error) {
        console.error("Error fetching ZK details:", error)
      }

      setPrescription({
        id: Number(id),
        doctorAddress: details[1],
        issueDate: new Date(Number(details[3]) * 1000),
        diagnosis: details[4],
        medications,
        isVerified,
        zkId: Number(zkId),
        commitment
      })
    } catch (error) {
      console.error("Failed to fetch prescription details:", error)
      toast({
        title: "Error",
        description: "Failed to fetch prescription details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading prescription details...</div>
      </div>
    )
  }

  if (!prescription) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="mx-auto size-16 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Prescription Not Found</h3>
            <p className="text-muted-foreground">
              The requested anonymous prescription could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="mx-auto max-w-4xl shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-green-600 to-green-800 text-white">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="mb-4 flex items-center md:mb-0">
              <Shield className="mr-3 size-10" />
              <div>
                <CardTitle className="text-3xl font-bold">
                  Anonymous Prescription #{prescription.id}
                </CardTitle>
                <p className="text-green-100">
                  Zero-Knowledge Protected Medical Prescription
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant={prescription.isVerified ? "default" : "secondary"}
                className={`mb-2 ${prescription.isVerified ? "bg-green-200 text-green-800" : "bg-yellow-200 text-yellow-800"}`}
              >
                {prescription.isVerified ? (
                  <>
                    <CheckCircle className="mr-1 size-4" />
                    ZK Verified
                  </>
                ) : (
                  <>
                    <AlertCircle className="mr-1 size-4" />
                    Pending Verification
                  </>
                )}
              </Badge>
              <div className="text-sm text-green-100">
                ZK ID: #{prescription.zkId}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="mt-6 space-y-8">
          {/* Zero-Knowledge Information */}
          <div className="rounded-lg bg-green-50 p-6 border border-green-200">
            <h2 className="mb-3 text-xl font-semibold text-green-800 flex items-center">
              <Shield className="mr-2 size-5" />
              Zero-Knowledge Proof Details
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium text-green-800">Verification Status:</p>
                <p className="text-sm text-green-700">
                  {prescription.isVerified ? "Cryptographically verified" : "Pending verification"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Commitment Hash:</p>
                <p className="break-all text-xs font-mono text-green-700 bg-white p-2 rounded">
                  {prescription.commitment.join(', ')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Privacy Protection:</p>
                <p className="text-sm text-green-700">
                  Patient identity is fully anonymized while maintaining prescription authenticity
                </p>
              </div>
            </div>
          </div>

          {/* Prescription Information */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-3 text-xl font-semibold text-primary flex items-center">
                <Calendar className="mr-2 size-5" />
                Prescription Information
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="block font-medium text-sm text-muted-foreground">Prescription ID:</span>
                  <span className="text-lg">#{prescription.id}</span>
                </div>
                <div>
                  <span className="block font-medium text-sm text-muted-foreground">Issue Date:</span>
                  <span className="text-lg">{prescription.issueDate.toDateString()}</span>
                </div>
                <div>
                  <span className="block font-medium text-sm text-muted-foreground">Diagnosis:</span>
                  <span className="text-lg">{prescription.diagnosis}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="mb-3 text-xl font-semibold text-primary flex items-center">
                <Stethoscope className="mr-2 size-5" />
                Doctor Information
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="block font-medium text-sm text-muted-foreground">Doctor Address:</span>
                  <span className="break-all text-sm font-mono bg-secondary p-2 rounded">
                    {prescription.doctorAddress}
                  </span>
                </div>
                <div>
                  <span className="block font-medium text-sm text-muted-foreground">Patient Information:</span>
                  <span className="text-sm text-muted-foreground italic">
                    Protected by zero-knowledge proof
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Medications */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-primary">
              Prescribed Medications
            </h2>
            <Table>
              <TableHeader className="bg-secondary">
                <TableRow>
                  <TableHead className="font-bold text-primary">
                    Medication
                  </TableHead>
                  <TableHead className="font-bold text-primary">
                    Dosage
                  </TableHead>
                  <TableHead className="font-bold text-primary">
                    Duration
                  </TableHead>
                  <TableHead className="font-bold text-primary">
                    Instructions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescription.medications.map((medication, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {medication.name}
                    </TableCell>
                    <TableCell>{medication.dosage}</TableCell>
                    <TableCell>{medication.duration} days</TableCell>
                    <TableCell>{medication.additionalInstructions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <CardFooter className="border-t pt-6">
          <div className="w-full">
            <Separator className="mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-lg bg-secondary p-6">
                <h3 className="mb-3 text-lg font-semibold text-primary">
                  Privacy Features:
                </h3>
                <ul className="list-inside list-disc space-y-2 text-sm">
                  <li>Patient identity fully anonymized</li>
                  <li>Prescription authenticity verified cryptographically</li>
                  <li>Zero-knowledge proof prevents data leakage</li>
                  <li>Compliant with privacy regulations</li>
                </ul>
              </div>
              <div className="rounded-lg bg-secondary p-6">
                <h3 className="mb-3 text-lg font-semibold text-primary">
                  Verification:
                </h3>
                <p className="text-sm mb-2">
                  Status: {prescription.isVerified ? "✅ Verified" : "⏳ Pending"}
                </p>
                <p className="text-sm">
                  This prescription can be verified independently using the 
                  zero-knowledge proof system without revealing patient information.
                </p>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
