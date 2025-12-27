"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Pill, 
  Clock, 
  Shield, 
  Database,
  Stethoscope,
  FileText,
  AlertCircle,
  CheckCircle,
  Download,
  QrCode
} from "lucide-react"
import axios from "axios"
import { QRCodeSVG } from "qrcode.react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Prescription {
  id: string
  issueDate: string
  validTill: string
  notes?: string
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
    specialization?: string
    licenseNumber?: string
  }
  medications: Array<{
    name: string
    dosage: string
    duration: string
    additionalInstructions?: string
  }>
}

export default function PrescriptionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [prescription, setPrescription] = useState<Prescription | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (params.id) {
      fetchPrescription(params.id as string)
    }
  }, [params.id])

  const fetchPrescription = async (id: string) => {
    try {
      // First get all prescriptions and find the one we need
      const response = await axios.get("/api/prescriptions?role=patient")
      const prescriptions = response.data
      const foundPrescription = prescriptions.find((p: Prescription) => p.id === id)
      
      if (foundPrescription) {
        setPrescription(foundPrescription)
      } else {
        toast({
          title: "Error",
          description: "Prescription not found.",
          variant: "destructive",
        })
        router.push("/dashboard/prescriptions")
      }
    } catch (error) {
      console.error("Failed to fetch prescription:", error)
      toast({
        title: "Error",
        description: "Failed to fetch prescription details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isExpired = (validTill: string) => {
    return new Date(validTill) < new Date()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
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
        <div className="text-center">
          <AlertCircle className="mx-auto size-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Prescription Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The prescription you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link href="/dashboard/prescriptions">
            <Button>
              <ArrowLeft className="mr-2 size-4" />
              Back to Prescriptions
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/prescriptions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Prescription Details</h1>
            <p className="text-muted-foreground">ID: {prescription.id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <QrCode className="mr-2 size-4" />
                QR Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Prescription QR Code</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center p-6">
                <QRCodeSVG
                  value={`${window.location.origin}/dashboard/prescriptions/${prescription.id}`}
                  size={200}
                  level="M"
                  marginSize={4}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Scan this QR code to share or verify this prescription
              </p>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Download className="mr-2 size-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className="mb-6">
        <Card className={`border-l-4 ${isExpired(prescription.validTill) ? 'border-l-red-500 bg-red-50' : 'border-l-green-500 bg-green-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {isExpired(prescription.validTill) ? (
                <AlertCircle className="size-5 text-red-600" />
              ) : (
                <CheckCircle className="size-5 text-green-600" />
              )}
              <span className={`font-medium ${isExpired(prescription.validTill) ? 'text-red-800' : 'text-green-800'}`}>
                {isExpired(prescription.validTill) ? 'This prescription has expired' : 'This prescription is active'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Doctor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Stethoscope className="mr-2 size-5" />
                Prescribing Doctor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="size-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="size-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{prescription.doctor.user.name}</h3>
                  {prescription.doctor.specialization && (
                    <p className="text-muted-foreground">{prescription.doctor.specialization}</p>
                  )}
                  {prescription.doctor.licenseNumber && (
                    <p className="text-sm text-muted-foreground">
                      License: {prescription.doctor.licenseNumber}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Pill className="mr-2 size-5" />
                Prescribed Medications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prescription.medications && prescription.medications.length > 0 ? (
                <div className="space-y-4">
                  {prescription.medications.map((medication, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-lg">{medication.name}</h4>
                        <Badge variant="outline">Medicine #{index + 1}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Dosage:</span>
                          <p className="text-muted-foreground">{medication.dosage}</p>
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span>
                          <p className="text-muted-foreground">{medication.duration}</p>
                        </div>
                      </div>
                      {medication.additionalInstructions && (
                        <div className="mt-3">
                          <span className="font-medium">Instructions:</span>
                          <p className="text-muted-foreground mt-1">{medication.additionalInstructions}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Pill className="mx-auto size-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {prescription.blockchainOnly 
                      ? "Medication details are stored on the blockchain but not available in this view."
                      : "No medications prescribed."
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {prescription.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 size-5" />
                  Additional Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{prescription.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Prescription Info */}
          <Card>
            <CardHeader>
              <CardTitle>Prescription Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Calendar className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Issue Date</p>
                  <p className="text-sm text-muted-foreground">{formatDate(prescription.issueDate)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center space-x-2">
                <Clock className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Valid Until</p>
                  <p className="text-sm text-muted-foreground">{formatDate(prescription.validTill)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center space-x-2">
                {prescription.blockchainOnly ? (
                  <Shield className="size-4 text-purple-600" />
                ) : (
                  <Database className="size-4 text-gray-600" />
                )}
                <div>
                  <p className="text-sm font-medium">Source</p>
                  <Badge 
                    variant="outline" 
                    className={prescription.blockchainOnly ? "text-purple-600 border-purple-300" : "text-gray-600 border-gray-300"}
                  >
                    {prescription.blockchainOnly ? "Blockchain" : "Database"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patient Info */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="size-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">{prescription.patient.user.name}</p>
                  <p className="text-sm text-muted-foreground">{prescription.patient.user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/verify-prescription" className="w-full">
                <Button variant="outline" className="w-full">
                  <Shield className="mr-2 size-4" />
                  Verify Prescription
                </Button>
              </Link>
              <Link href="/dashboard/appointments/book" className="w-full">
                <Button variant="outline" className="w-full">
                  <Calendar className="mr-2 size-4" />
                  Book Follow-up
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
