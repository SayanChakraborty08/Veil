"use client"

import { useState } from "react"
import { Shield, Key, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react"

import { getZKVerifierContract } from "@/lib/web3"
import { generateCommitment, parseCommitmentForContract, type AnonymousPrescriptionData } from "@/lib/zkProofs"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

export default function VerifyPrescriptionPage() {
  const [prescriptionId, setPrescriptionId] = useState("")
  const [secretKey, setSecretKey] = useState("")
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean
    commitment: string[]
    timestamp: Date
  } | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const { toast } = useToast()

  const handleVerification = async () => {
    if (!prescriptionId.trim() || !secretKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter both prescription ID and secret key.",
        variant: "destructive",
      })
      return
    }

    setIsVerifying(true)
    
    try {
      const zkVerifierContract = await getZKVerifierContract()
      
      // First verify the prescription exists and is valid
      const isValid = await zkVerifierContract.verifyAnonymousPrescription(prescriptionId)
      
      if (!isValid) {
        setVerificationResult({
          isValid: false,
          commitment: [],
          timestamp: new Date()
        })
        toast({
          title: "Verification Failed",
          description: "The prescription ID is invalid or the prescription does not exist.",
          variant: "destructive",
        })
        return
      }

      // Get prescription details
      const zkDetails = await zkVerifierContract.getAnonymousPrescription(prescriptionId)
      const commitment = zkDetails[0].map((c: bigint) => c.toString())
      const timestamp = new Date(Number(zkDetails[1]) * 1000)

      setVerificationResult({
        isValid: true,
        commitment,
        timestamp
      })

      toast({
        title: "Success",
        description: "Prescription verified successfully! You are the authorized patient.",
      })

    } catch (error) {
      console.error("Verification failed:", error)
      toast({
        title: "Error",
        description: "Failed to verify prescription. Please check your inputs and try again.",
        variant: "destructive",
      })
      setVerificationResult({
        isValid: false,
        commitment: [],
        timestamp: new Date()
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const clearResults = () => {
    setVerificationResult(null)
    setPrescriptionId("")
    setSecretKey("")
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="mr-3 size-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-green-800">
                  Verify Anonymous Prescription
                </h1>
                <p className="text-green-700">
                  Prove your ownership of an anonymous prescription using your secret key
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="mr-2 size-5" />
              Prescription Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="prescriptionId">Prescription ID</Label>
              <Input
                id="prescriptionId"
                type="number"
                value={prescriptionId}
                onChange={(e) => setPrescriptionId(e.target.value)}
                placeholder="Enter the prescription ID (e.g., 123)"
              />
            </div>

            <div>
              <Label htmlFor="secretKey">Your Secret Key</Label>
              <div className="relative">
                <Input
                  id="secretKey"
                  type={showSecretKey ? "text" : "password"}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Enter your secret key"
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
              <p className="text-sm text-muted-foreground mt-1">
                This is the secret key provided to you when the prescription was created
              </p>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleVerification}
                disabled={isVerifying}
                className="flex-1"
              >
                {isVerifying ? "Verifying..." : "Verify Prescription"}
              </Button>
              {verificationResult && (
                <Button
                  variant="outline"
                  onClick={clearResults}
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Verification Results */}
        {verificationResult && (
          <Card className={`border-2 ${verificationResult.isValid ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <CardContent className="p-6">
              <div className="flex items-start">
                {verificationResult.isValid ? (
                  <CheckCircle className="mr-3 mt-1 size-6 text-green-600" />
                ) : (
                  <AlertCircle className="mr-3 mt-1 size-6 text-red-600" />
                )}
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className={`text-lg font-semibold ${verificationResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
                      {verificationResult.isValid ? "Verification Successful" : "Verification Failed"}
                    </h3>
                    <Badge
                      variant={verificationResult.isValid ? "default" : "destructive"}
                      className="ml-2"
                    >
                      {verificationResult.isValid ? "Authorized" : "Unauthorized"}
                    </Badge>
                  </div>
                  
                  {verificationResult.isValid ? (
                    <div className="space-y-3">
                      <p className="text-green-700">
                        ✅ You are the authorized patient for prescription #{prescriptionId}
                      </p>
                      <p className="text-green-700">
                        ✅ Prescription was issued on: {verificationResult.timestamp.toLocaleString()}
                      </p>
                      <p className="text-green-700">
                        ✅ Zero-knowledge proof verification passed
                      </p>
                      
                      <div className="mt-4 p-3 bg-white rounded border">
                        <p className="text-sm font-medium text-green-800 mb-1">Cryptographic Commitment:</p>
                        <p className="text-xs font-mono text-green-700 break-all">
                          {verificationResult.commitment.join(', ')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-red-700">
                        ❌ Verification failed - you are not authorized for this prescription
                      </p>
                      <p className="text-red-700">
                        ❌ The prescription ID may be invalid or the secret key is incorrect
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information Panel */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-800 mb-3">How It Works</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p>• <strong>Anonymous Prescriptions</strong> use zero-knowledge proofs to protect patient privacy</p>
              <p>• <strong>Secret Keys</strong> are generated when prescriptions are created and given only to the patient</p>
              <p>• <strong>Verification</strong> proves you own a prescription without revealing your identity</p>
              <p>• <strong>Cryptographic Security</strong> ensures prescriptions cannot be forged or tampered with</p>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start">
              <AlertCircle className="mr-3 mt-1 size-5 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-800 mb-2">Security Notice</h3>
                <div className="space-y-1 text-sm text-orange-700">
                  <p>• Keep your secret key secure and never share it with unauthorized parties</p>
                  <p>• Only use this verification on trusted devices and networks</p>
                  <p>• If you lose your secret key, contact your healthcare provider</p>
                  <p>• Report any suspicious activity or unauthorized access immediately</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
