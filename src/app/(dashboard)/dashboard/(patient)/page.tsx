"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { PatientDashboardData } from "@/types"
import { Heart, Shield, Zap, User, Plus, Wallet } from "lucide-react"
import { ethers } from "ethers"

import { getMedicalContract, connectWallet, hasMetaMask, getCurrentAccount } from "@/lib/web3"
import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

import PatientProfile from "./profile"

export default function PatientPage() {
  const { data: session, status } = useSession()
  const [patientData, setPatientData] = useState<PatientDashboardData | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [patientName, setPatientName] = useState("")
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const { toast } = useToast()

  const connectWalletHandler = async () => {
    setIsConnectingWallet(true)
    try {
      const { signer, address } = await connectWallet()
      setWalletConnected(true)
      setWalletAddress(address)
      toast({
        title: "Wallet Connected",
        description: `Connected to ${address.substring(0, 6)}...${address.substring(38)}`,
      })
      // Refresh patient data after wallet connection
      await fetchPatientData(address)
    } catch (error: any) {
      console.error("Wallet connection failed:", error)
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet.",
        variant: "destructive",
      })
    } finally {
      setIsConnectingWallet(false)
    }
  }

  const checkWalletConnection = async () => {
    if (!hasMetaMask()) {
      return false
    }

    try {
      const address = await getCurrentAccount()
      if (address) {
        setWalletConnected(true)
        setWalletAddress(address)
        return true
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error)
    }
    return false
  }

  const registerPatient = async () => {
    if (!patientName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to register.",
        variant: "destructive",
      })
      return
    }

    if (!walletConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first.",
        variant: "destructive",
      })
      return
    }

    setIsRegistering(true)
    try {
      console.log("Starting patient registration for:", patientName)
      console.log("Wallet address:", walletAddress)
      
      const medicalContract = await getMedicalContract(true)
      console.log("Got contract instance, calling registerPatient...")
      
      const tx = await medicalContract.registerPatient(patientName)
      console.log("Transaction submitted:", tx.hash)
      
      toast({
        title: "Transaction Submitted",
        description: "Please wait for transaction confirmation...",
      })

      const receipt = await tx.wait()
      console.log("Transaction confirmed:", receipt)
      
      toast({
        title: "Registration Successful",
        description: "You have been registered as a patient.",
      })
      
      // Wait a bit for the blockchain to update, then refresh the patient data
      setTimeout(async () => {
        console.log("Refreshing patient data after registration...")
        await fetchPatientData(walletAddress)
      }, 2000)
      
    } catch (error: any) {
      console.error("Registration failed:", error)
      let errorMessage = "An error occurred during registration."
      
      if (error.message.includes("user rejected")) {
        errorMessage = "Transaction was rejected by user."
      } else if (error.message.includes("already registered")) {
        errorMessage = "You are already registered as a patient."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsRegistering(false)
    }
  }

  const fetchPatientData = useCallback(async (address?: string) => {
    try {
      setIsLoading(true)
      
      const currentAddress = address || walletAddress
      if (!currentAddress) {
        console.log("No wallet address available")
        setPatientData(null)
        return
      }

      console.log("Fetching patient data for address:", currentAddress)
      
      // First try to get patient data from the database
      let dbPatientData: any = null
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/users/patient')
          if (response.ok) {
            const patients = await response.json()
            dbPatientData = patients.find((p: any) => p.userId === session.user.id)
            console.log("Database patient data:", dbPatientData)
          }
        } catch (dbError) {
          console.log("No database patient data found:", dbError)
        }
      }
      
      const medicalContract = await getMedicalContract(false)
      console.log("Contract address:", process.env.NEXT_PUBLIC_MEDICAL_CONTRACT_ADDRESS)
      
      // Check if patient exists in the contract
      try {
        console.log("Calling contract patients function...")
        const contractData = await medicalContract.patients(currentAddress)
        console.log("Contract response:", contractData)
        
        // Check if patient data exists (non-zero address indicates registration)
        if (contractData.patientAddress && contractData.patientAddress !== "0x0000000000000000000000000000000000000000") {
          console.log("Patient found! Setting patient data...")
          setPatientData({
            id: contractData.patientAddress,
            userId: session?.user?.id || contractData.patientAddress,
            name: contractData.name,
            email: session?.user?.email || "user@example.com",
            image: session?.user?.image || "/logo.svg",
            // Use database data if available, otherwise use placeholder
            gender: dbPatientData?.gender || "Not specified",
            dateOfBirth: dbPatientData?.dateOfBirth ? new Date(dbPatientData.dateOfBirth) : new Date(),
            bloodType: dbPatientData?.bloodType || "Not specified",
            chronicDiseases: dbPatientData?.chronicDiseases || [],
            emergencyContact: dbPatientData?.emergencyContact || "Not provided",
            blockId: contractData.patientAddress,
          })
        } else {
          // Patient not registered
          console.log("Patient not registered - empty or zero address:", contractData.patientAddress)
          setPatientData(null)
        }
      } catch (contractError: any) {
        console.error("Contract call failed:", contractError)
        setPatientData(null)
      }
    } catch (error: any) {
      console.error("Failed to fetch patient data:", error)
      toast({
        title: "Connection Error",
        description: "Failed to connect to the blockchain. Please check your connection.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress, session?.user?.id, session?.user?.email, session?.user?.image, toast])

  useEffect(() => {
    const initializeWalletAndData = async () => {
      // Check wallet connection directly without auth check
      const connected = await checkWalletConnection()
      if (connected) {
        await fetchPatientData()
      } else {
        setIsLoading(false)
      }
    }

    initializeWalletAndData()
  }, [])

  // Separate effect to fetch patient data when wallet address changes
  useEffect(() => {
    if (walletConnected && walletAddress) {
      fetchPatientData(walletAddress)
    }
  }, [walletAddress, walletConnected, fetchPatientData])

  if (isLoading) {
    return (
      <DashboardShell>
        <DashboardHeader
          heading="Patient Profile"
          text="Loading your patient information..."
        />
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </DashboardShell>
    )
  }

  if (!hasMetaMask()) {
    return (
      <DashboardShell>
        <DashboardHeader
          heading="Wallet Required"
          text="Please install MetaMask to continue"
        />
        <div className="max-w-md mx-auto">
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              MetaMask is required to interact with the blockchain. Please install MetaMask extension in your browser to continue.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardShell>
    )
  }

  if (!walletConnected) {
    return (
      <DashboardShell>
        <DashboardHeader
          heading="Connect Wallet"
          text="Please connect your wallet to access patient features"
        />
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="mr-2 h-5 w-5" />
                Connect Your Wallet
              </CardTitle>
              <CardDescription>
                Connect your MetaMask wallet to register as a patient and manage your medical records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={connectWalletHandler} 
                disabled={isConnectingWallet}
                className="w-full"
              >
                {isConnectingWallet ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect MetaMask
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    )
  }

  if (!patientData) {
    return (
      <DashboardShell>
        <DashboardHeader
          heading="Patient Registration"
          text="Register to access your patient dashboard"
        />
        <div className="max-w-md mx-auto">
          <Alert className="mb-4">
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              Connected to: {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
            </AlertDescription>
          </Alert>
          
          {/* Debug info */}
          <Alert className="mb-4">
            <AlertDescription>
              <div className="text-xs space-y-1">
                <div>Contract: {process.env.NEXT_PUBLIC_MEDICAL_CONTRACT_ADDRESS}</div>
                <div>Network: Check MetaMask network</div>
              </div>
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Register as Patient
              </CardTitle>
              <CardDescription>
                Join our platform to manage your medical records and prescriptions securely on the blockchain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="patientName" className="block text-sm font-medium mb-2">
                  Full Name
                </label>
                <Input
                  id="patientName"
                  type="text"
                  placeholder="Enter your full name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  disabled={isRegistering}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={registerPatient} 
                  disabled={isRegistering || !patientName.trim()}
                  className="flex-1"
                >
                  {isRegistering ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Registering...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Register as Patient
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => fetchPatientData(walletAddress)}
                  disabled={isRegistering}
                >
                  Check Status
                </Button>
              </div>
              
              {/* Temporary bypass for testing */}
              <Button 
                variant="secondary"
                onClick={() => {
                  setPatientData({
                    id: walletAddress,
                    userId: walletAddress,
                    name: patientName || "Test Patient",
                    email: "test@example.com",
                    image: "/logo.svg",
                    gender: "N/A",
                    dateOfBirth: new Date(),
                    bloodType: "N/A",
                    chronicDiseases: [],
                    emergencyContact: "N/A",
                    blockId: walletAddress,
                  })
                }}
                className="w-full"
              >
                Skip & View Dashboard (Testing)
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    )
  }0x70997970C51812dc3A010C7d01b50e0d17dc79C8

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Patient Profile"
        text="See all things related to you"
      />
      <div className="mb-4">
        <Alert>
          <Wallet className="h-4 w-4" />
          <AlertDescription>
            Connected to: {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
          </AlertDescription>
        </Alert>
      </div>
      <PatientProfile patientData={patientData} />
    </DashboardShell>
  )
}

