"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Shield, Eye, EyeOff } from "lucide-react"

import { getMedicalWithZKContract } from "@/lib/web3"
import { generateZKProof, generateSecretKey, parseCommitmentForContract, type AnonymousPrescriptionData } from "@/lib/zkProofs"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"

interface Medication {
  name: string
  dosage: string
  duration: string
  additionalInstructions: string
}

export default function AnonymousPrescriptionPage() {
  const [medications, setMedications] = useState<Medication[]>([
    { name: "", dosage: "", duration: "", additionalInstructions: "" }
  ])
  const [diagnosis, setDiagnosis] = useState("")
  const [secretKey, setSecretKey] = useState("")
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [isGeneratingProof, setIsGeneratingProof] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

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

  const generateNewSecretKey = () => {
    const newKey = generateSecretKey()
    setSecretKey(newKey)
    toast({
      title: "Secret Key Generated",
      description: "A new secret key has been generated. Please save it securely!",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!diagnosis.trim()) {
      toast({
        title: "Error",
        description: "Please enter a diagnosis.",
        variant: "destructive",
      })
      return
    }

    if (!secretKey.trim()) {
      toast({
        title: "Error",
        description: "Please generate or enter a secret key.",
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
      setIsGeneratingProof(true)
      
      // Get current user address as doctor ID
      const medicalContract = await getMedicalWithZKContract()
      const signer = await medicalContract.runner
      const doctorAddress = await signer?.getAddress()

      // Prepare prescription data
      const prescriptionData: AnonymousPrescriptionData = {
        medications,
        diagnosis,
        doctorId: doctorAddress,
        secretKey
      }

      // Generate ZK proof
      const zkProof = await generateZKProof(prescriptionData)
      const commitment = parseCommitmentForContract(zkProof.inputs[0])
      
      setIsGeneratingProof(false)
      setIsSubmitting(true)

      // Submit anonymous prescription to contract
      const tx = await medicalContract.issueAnonymousPrescription(
        medications,
        diagnosis,
        commitment,
        zkProof.proof.a,
        zkProof.proof.b,
        zkProof.proof.c,
        [zkProof.inputs[0]] // public inputs
      )

      await tx.wait()

      toast({
        title: "Success",
        description: "Anonymous prescription created successfully!",
      })

      // Clear form
      setMedications([{ name: "", dosage: "", duration: "", additionalInstructions: "" }])
      setDiagnosis("")
      setSecretKey("")
      
    } catch (error) {
      console.error("Failed to create anonymous prescription:", error)
      toast({
        title: "Error",
        description: "Failed to create anonymous prescription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingProof(false)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="mx-auto max-w-4xl">
        <CardHeader className="border-b bg-gradient-to-r from-green-600 to-green-800 text-white">
          <div className="flex items-center">
            <Shield className="mr-3 size-8" />
            <div>
              <CardTitle className="text-2xl font-bold">
                Create Anonymous Prescription
              </CardTitle>
              <p className="text-green-100">
                Issue prescriptions with zero-knowledge privacy protection
              </p>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            {/* Privacy Notice */}
            <div className="rounded-lg bg-green-50 p-4 border border-green-200">
              <div className="flex items-start">
                <Shield className="mr-3 mt-1 size-5 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">Privacy Protection</h3>
                  <p className="text-sm text-green-700 mt-1">
                    This prescription will be created using zero-knowledge proofs, ensuring patient anonymity 
                    while maintaining prescription validity and authenticity.
                  </p>
                </div>
              </div>
            </div>

            {/* Secret Key Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="secretKey" className="text-lg font-semibold">
                  Secret Key
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateNewSecretKey}
                >
                  Generate New Key
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="secretKey"
                  type={showSecretKey ? "text" : "password"}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Generate or enter your secret key"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                >
                  {showSecretKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Keep this secret key safe! You'll need it to prove ownership of this prescription later.
              </p>
            </div>

            <Separator />

            {/* Diagnosis */}
            <div className="space-y-2">
              <Label htmlFor="diagnosis" className="text-lg font-semibold">
                Diagnosis
              </Label>
              <Textarea
                id="diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Enter the medical diagnosis"
                className="min-h-[80px]"
              />
            </div>

            {/* Medications */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Medications</Label>
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
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`medication-${index}`}>Medication Name</Label>
                      <Input
                        id={`medication-${index}`}
                        value={medication.name}
                        onChange={(e) => updateMedication(index, "name", e.target.value)}
                        placeholder="e.g., Aspirin"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`dosage-${index}`}>Dosage</Label>
                      <Input
                        id={`dosage-${index}`}
                        value={medication.dosage}
                        onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                        placeholder="e.g., 100mg"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`duration-${index}`}>Duration (days)</Label>
                      <Input
                        id={`duration-${index}`}
                        type="number"
                        value={medication.duration}
                        onChange={(e) => updateMedication(index, "duration", e.target.value)}
                        placeholder="e.g., 7"
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
                  {medications.length > 1 && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeMedication(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </CardContent>

          <CardFooter className="border-t">
            <Button
              type="submit"
              className="w-full"
              disabled={isGeneratingProof || isSubmitting}
            >
              {isGeneratingProof
                ? "Generating Zero-Knowledge Proof..."
                : isSubmitting
                ? "Submitting Anonymous Prescription..."
                : "Create Anonymous Prescription"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
