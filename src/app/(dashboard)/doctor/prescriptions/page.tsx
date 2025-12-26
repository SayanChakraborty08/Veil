"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Eye, Calendar, User, Stethoscope, Pill, Shield } from "lucide-react"
import axios from "axios"
import { getSigner } from "@/lib/web3"

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

interface Prescription {
  id: string
  issueDate: string
  validTill: string
  blockchainOnly?: boolean
  patient: {
    user: {
      name: string
      email: string
    }
  }
  doctor: {
    user: {
      name: string
    }
  }
  medications: Array<{
    name: string
    dosage: string
    duration: string
  }>
}

export default function DoctorPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchPrescriptions()
  }, [])

  const fetchPrescriptions = async () => {
    try {
      const response = await axios.get("/api/prescriptions?role=doctor")
      setPrescriptions(response.data)
    } catch (error) {
      console.error("Failed to fetch prescriptions:", error)
      toast({
        title: "Error",
        description: "Failed to fetch prescriptions.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isExpired = (validTill: string) => {
    return new Date(validTill) < new Date()
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading prescriptions...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prescriptions</h1>
          <p className="text-muted-foreground">Manage prescriptions you've issued</p>
        </div>
        <div className="space-x-2">
          <Link href="/dashboard/anonymous-prescriptions/create">
            <Button variant="outline">
              <Plus className="mr-2 size-4" />
              Anonymous Prescription
            </Button>
          </Link>
          <Link href="/doctor/prescriptions/create">
            <Button>
              <Plus className="mr-2 size-4" />
              New Prescription
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Stethoscope className="size-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Prescriptions</p>
                <p className="text-2xl font-bold">{prescriptions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="size-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {prescriptions.filter(p => !isExpired(p.validTill)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="size-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  {prescriptions.filter(p => {
                    const now = new Date()
                    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1)
                    return new Date(p.issueDate) >= monthAgo
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="size-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Blockchain</p>
                <p className="text-2xl font-bold">
                  {prescriptions.filter(p => p.blockchainOnly).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prescriptions Table */}
      {prescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Stethoscope className="mx-auto size-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Prescriptions</h3>
            <p className="text-muted-foreground mb-6">
              You haven't issued any prescriptions yet. Create your first one to get started.
            </p>
            <Link href="/doctor/prescriptions/create">
              <Button>
                <Plus className="mr-2 size-4" />
                Create Your First Prescription
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Pill className="mr-2 size-5" />
              Your Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Medications</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((prescription) => (
                  <TableRow key={prescription.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{prescription.patient.user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {prescription.patient.user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(prescription.issueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(prescription.validTill).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {prescription.medications && prescription.medications.length > 0 ? (
                          <>
                            {prescription.medications.slice(0, 2).map((med, index) => (
                              <div key={index} className="text-sm">
                                {med.name} - {med.dosage}
                              </div>
                            ))}
                            {prescription.medications.length > 2 && (
                              <div className="text-sm text-muted-foreground">
                                +{prescription.medications.length - 2} more
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {prescription.blockchainOnly ? "Details on blockchain" : "No medications"}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isExpired(prescription.validTill) ? "destructive" : "default"}
                      >
                        {isExpired(prescription.validTill) ? "Expired" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {prescription.blockchainOnly ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          <Shield className="mr-1 size-3" />
                          Blockchain
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          Database
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/doctor/prescriptions/${prescription.id}`}>
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
    </div>
  )
}
