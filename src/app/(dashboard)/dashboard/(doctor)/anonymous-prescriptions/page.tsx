"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Shield, Eye, Plus, Calendar, Stethoscope } from "lucide-react"

import { getMedicalWithZKContract, getZKVerifierContract } from "@/lib/web3"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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
import { useToast } from "@/components/ui/use-toast"

interface AnonymousPrescription {
  id: number
  doctorAddress: string
  issueDate: Date
  diagnosis: string
  isVerified: boolean
  zkId: number
}

export default function AnonymousPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<AnonymousPrescription[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchAnonymousPrescriptions()
  }, [])

  const fetchAnonymousPrescriptions = async () => {
    try {
      const medicalContract = await getMedicalWithZKContract()
      const zkVerifierContract = await getZKVerifierContract()
      const signer = await medicalContract.runner
      const doctorAddress = await signer.getAddress()

      // Get doctor's anonymous prescriptions
      const prescriptionIds = await medicalContract.getDoctorAnonymousPrescriptions(doctorAddress)
      
      const prescriptionData = await Promise.all(
        prescriptionIds.map(async (id: bigint) => {
          const details = await medicalContract.getPrescriptionDetails(Number(id))
          const zkId = await medicalContract.prescriptionToZKId(Number(id))
          
          // Check if ZK prescription is verified
          let isVerified = false
          try {
            isVerified = await zkVerifierContract.verifyAnonymousPrescription(Number(zkId))
          } catch (error) {
            console.error("Error verifying ZK prescription:", error)
          }

          return {
            id: Number(id),
            doctorAddress: details[1],
            issueDate: new Date(Number(details[3]) * 1000),
            diagnosis: details[4],
            isVerified,
            zkId: Number(zkId)
          }
        })
      )

      setPrescriptions(prescriptionData)
    } catch (error) {
      console.error("Failed to fetch anonymous prescriptions:", error)
      toast({
        title: "Error",
        description: "Failed to fetch anonymous prescriptions.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading anonymous prescriptions...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Shield className="mr-3 size-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold">Anonymous Prescriptions</h1>
            <p className="text-muted-foreground">
              Prescriptions protected by zero-knowledge proofs
            </p>
          </div>
        </div>
        <Link href="/dashboard/anonymous-prescriptions/create">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 size-4" />
            Create Anonymous Prescription
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="size-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Anonymous</p>
                <p className="text-2xl font-bold">{prescriptions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Eye className="size-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold">
                  {prescriptions.filter(p => p.isVerified).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="size-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  {prescriptions.filter(p => {
                    const now = new Date()
                    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1)
                    return p.issueDate >= monthAgo
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {prescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="mx-auto size-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Anonymous Prescriptions</h3>
            <p className="text-muted-foreground mb-6">
              You haven't created any anonymous prescriptions yet. Create your first one to get started.
            </p>
            <Link href="/dashboard/anonymous-prescriptions/create">
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="mr-2 size-4" />
                Create Your First Anonymous Prescription
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Stethoscope className="mr-2 size-5" />
              Your Anonymous Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prescription ID</TableHead>
                  <TableHead>ZK ID</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((prescription) => (
                  <TableRow key={prescription.id}>
                    <TableCell className="font-medium">
                      #{prescription.id}
                    </TableCell>
                    <TableCell>
                      #{prescription.zkId}
                    </TableCell>
                    <TableCell>
                      {prescription.issueDate.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {prescription.diagnosis}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={prescription.isVerified ? "default" : "secondary"}
                        className={prescription.isVerified ? "bg-green-600" : ""}
                      >
                        {prescription.isVerified ? "Verified" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/anonymous-prescriptions/${prescription.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 size-4" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Privacy Information */}
      <Card className="mt-6 border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-start">
            <Shield className="mr-3 mt-1 size-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800 mb-2">Zero-Knowledge Privacy</h3>
              <p className="text-sm text-green-700">
                Anonymous prescriptions use zero-knowledge proofs to verify prescription validity 
                without revealing patient identity. The system ensures:
              </p>
              <ul className="text-sm text-green-700 mt-2 ml-4 list-disc">
                <li>Patient privacy is fully protected</li>
                <li>Prescription authenticity is cryptographically verified</li>
                <li>Only authorized parties can access prescription details</li>
                <li>Compliance with privacy regulations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
