"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Minus, Stethoscope, User, Calendar } from "lucide-react"
import axios from "axios"

import { getMedicalContract } from "@/lib/web3"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Medication {
  name: string
  dosage: string
  duration: string
  additionalInstructions: string
}

interface Patient {
  id: string
  user: {
    name: string
    email: string
  }
  blockId: string
}

export default function CreatePrescriptionPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState("")
  const [selectedPatientAddress, setSelectedPatientAddress] = useState("")
  const [medications, setMedications] = useState<Medication[]>([
    { name: "", dosage: "", duration: "", additionalInstructions: "" }
  ])
  const [diagnosis, setDiagnosis] = useState("")
  const [validTill, setValidTill] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      // In a real app, you'd fetch patients that the doctor has access to
      // For now, we'll create a simple patient selection
      // This would need to be implemented based on your access control system
      setPatients([])
    } catch (error) {
      console.error("Failed to fetch patients:", error)
    }
  }

  const addMedication = () => {
    setMedications([...medications, { name: "", dosage: "", duration: "", additionalInstructions: "" }])
  }

  const removeMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index))
    }
  }

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = medications.map((med, i) => 
      i === index ? { ...med, [field]: value } : med
    )
    setMedications(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPatientAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter a patient address.",
        variant: "destructive",
      })
      return
    }

    if (!diagnosis.trim()) {
      toast({
        title: "Error",
        description: "Please enter a diagnosis.",
        variant: "destructive",
      })
      return
    }

    if (medications.some(med => !med.name.trim() || !med.dosage.trim() || !med.duration.trim())) {
      toast({
        title: "Error",
        description: "Please fill in all medication fields.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      
      // Issue prescription on blockchain
      const medicalContract = await getMedicalContract()
      
      // Prepare medications for blockchain
      const blockchainMedications = medications.map(med => ({
        name: med.name,
        dosage: med.dosage,
        duration: parseInt(med.duration),
        additionalInstructions: med.additionalInstructions
      }))

      // Issue prescription on blockchain
      const tx = await medicalContract.issuePrescription(
        selectedPatientAddress,
        blockchainMedications,
        diagnosis
      )
      
      await tx.wait()

      // Save to database - find patient by address if no ID selected
      let patientIdForDb = selectedPatientId
      
      if (!patientIdForDb && selectedPatientAddress) {
        // Look up patient by wallet address
        const patientResponse = await axios.get(`/api/patients?address=${selectedPatientAddress}`)
        if (patientResponse.data && patientResponse.data.length > 0) {
          patientIdForDb = patientResponse.data[0].id
        }
      }

      if (patientIdForDb) {
        const prescriptionResponse = await axios.post("/api/prescriptions", {
          patientId: patientIdForDb,
          medications,
          validTill: validTill || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        console.log("Prescription saved to database:", prescriptionResponse.data)
      } else {
        console.warn("No patient ID found for database storage - prescription only on blockchain")
      }

      toast({
        title: "Success!",
        description: "Prescription issued successfully.",
      })

      router.push("/doctor/prescriptions")
    } catch (error: any) {
      console.error("Failed to issue prescription:", error)
      toast({
        title: "Error",
        description: `Failed to issue prescription: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate default valid till date (30 days from now)
  const defaultValidTill = new Date()
  defaultValidTill.setDate(defaultValidTill.getDate() + 30)
  const defaultValidTillString = defaultValidTill.toISOString().split('T')[0]

  return (
    <div className="container mx-auto p-6">
      <Card className="mx-auto max-w-4xl">
        <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <div className="flex items-center">
            <Stethoscope className="mr-3 size-8" />
            <div>
              <CardTitle className="text-2xl font-bold">
                Issue New Prescription
              </CardTitle>
              <p className="text-blue-100">
                Create a new prescription for your patient
              </p>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            
            {/* Patient Selection */}
            <div className="space-y-4">
              <div className="flex items-center">
                <User className="mr-2 size-5 text-blue-600" />
                <Label className="text-lg font-semibold">Patient Information</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patient-select">Select Patient (Optional)</Label>
                  <Select value={selectedPatientId} onValueChange={(value) => {
                    setSelectedPatientId(value)
                    const patient = patients.find(p => p.id === value)
                    if (patient) {
                      setSelectedPatientAddress(patient.blockId)
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.user.name} ({patient.user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="patient-address">Patient Wallet Address *</Label>
                  <Input
                    id="patient-address"
                    value={selectedPatientAddress}
                    onChange={(e) => setSelectedPatientAddress(e.target.value)}
                    placeholder="0x..."
                    required
                  />
                </div>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="space-y-2">
              <Label htmlFor="diagnosis" className="text-lg font-semibold">
                Diagnosis *
              </Label>
              <Textarea
                id="diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Enter the medical diagnosis"
                className="min-h-[80px]"
                required
              />
            </div>

            {/* Valid Till */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Calendar className="mr-2 size-5 text-blue-600" />
                <Label htmlFor="valid-till" className="text-lg font-semibold">
                  Valid Until
                </Label>
              </div>
              <Input
                id="valid-till"
                type="date"
                value={validTill || defaultValidTillString}
                onChange={(e) => setValidTill(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Medications */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Medications *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMedication}
                >
                  <Plus className="mr-2 size-4" />
                  Add Medication
                </Button>
              </div>

              {medications.map((medication, index) => (
                <Card key={index} className="p-4 border-blue-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Medication {index + 1}</h4>
                      {medications.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeMedication(index)}
                        >
                          <Minus className="mr-2 size-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`medication-${index}`}>Medication Name *</Label>
                        <Input
                          id={`medication-${index}`}
                          value={medication.name}
                          onChange={(e) => updateMedication(index, "name", e.target.value)}
                          placeholder="e.g., Aspirin"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`dosage-${index}`}>Dosage *</Label>
                        <Input
                          id={`dosage-${index}`}
                          value={medication.dosage}
                          onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                          placeholder="e.g., 100mg"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`duration-${index}`}>Duration (days) *</Label>
                        <Input
                          id={`duration-${index}`}
                          type="number"
                          value={medication.duration}
                          onChange={(e) => updateMedication(index, "duration", e.target.value)}
                          placeholder="e.g., 7"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`instructions-${index}`}>Additional Instructions</Label>
                        <Input
                          id={`instructions-${index}`}
                          value={medication.additionalInstructions}
                          onChange={(e) => updateMedication(index, "additionalInstructions", e.target.value)}
                          placeholder="e.g., Take with food"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>

          <CardFooter className="border-t">
            <div className="flex w-full justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Issuing Prescription..." : "Issue Prescription"}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
