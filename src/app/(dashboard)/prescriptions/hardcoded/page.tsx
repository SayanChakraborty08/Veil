"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Shield, Calendar, Stethoscope, Pill, Clock, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function PrescriptionDetailPage() {
  const prescription = {
    id: "49802942",
    doctorName: "Dr. Om Thorat",
    doctorSpecialization: "EMT",
    patientName: "",
    issueDate: new Date().toLocaleDateString(),
    validTill: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    medications: [
      {
        name: "Dolo",
        dosage: "500mg",
        duration: "3 days",
        frequency: "",
        additionalInstructions: "",
      },
    ],
    isVerified: true,
    source: "Blockchain",
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/patient/prescriptions">
          <Button variant="outline">
            <ArrowLeft className="mr-2 size-4" />
            Back to Prescriptions
          </Button>
        </Link>
      </div>

      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Prescription Details</CardTitle>
              <CardDescription>
                Issued on {prescription.issueDate}
              </CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1 border-green-300 bg-green-50 text-green-700">
              <Shield className="size-4" />
              Verified on {prescription.source}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Doctor Info */}
            <div className="space-y-1">
              <h3 className="font-semibold text-muted-foreground">Doctor</h3>
              <div className="flex items-center gap-2">
                <Stethoscope className="size-5" />
                <div>
                  <p className="font-medium">{prescription.doctorName}</p>
                  <p className="text-sm text-muted-foreground">{prescription.doctorSpecialization}</p>
                </div>
              </div>
            </div>
            {/* Patient Info */}
            <div className="space-y-1">
              <h3 className="font-semibold text-muted-foreground">Patient</h3>
              <p className="font-medium">{prescription.patientName}</p>
            </div>
          </div>

          <Separator />

          {/* Medication Details */}
          <div>
            <h3 className="mb-4 text-lg font-semibold flex items-center">
              <Pill className="mr-2 size-5" />
              Medication
            </h3>
            <div className="space-y-4">
              {prescription.medications.map((med, index) => (
                <Alert key={index}>
                  <AlertTitle className="font-bold">{med.name} - {med.dosage}</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center text-sm">
                        <Calendar className="mr-2 size-4 text-muted-foreground" />
                        <strong>Duration:</strong><span className="ml-2">{med.duration}</span>
                      </div>
                      {/* <div className="flex items-center text-sm">
                        <Clock className="mr-2 size-4 text-muted-foreground" />
                        <strong>Frequency:</strong><span className="ml-2">{med.frequency}</span>
                      </div> */}
                      {med.additionalInstructions && (
                        <p className="pt-2 text-sm text-muted-foreground">{med.additionalInstructions}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center bg-muted/50 px-6 py-3">
          <p className="text-sm text-muted-foreground">
            Valid Until: {prescription.validTill}
          </p>
          <Button>Download PDF</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
