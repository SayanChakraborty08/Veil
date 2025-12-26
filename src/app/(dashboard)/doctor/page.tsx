"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  Briefcase,
  Clock,
  DollarSign,
  Heart,
  Mail,
  Moon,
  Phone,
  Plus,
  Shield,
  Star,
  Sun,
  User,
  Zap,
} from "lucide-react"
import { ethers } from "ethers"

import { getMedicalContract, getSigner } from "@/lib/web3"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

// Mock patient data
const patients = [
  {
    id: 1,
    name: "John Doe",
    lastVisit: new Date("2023-05-20"),
    image: "/placeholder.svg?height=50&width=50",
    address: "0x...", // Add patient address
  },
  {
    id: 2,
    name: "Alice Johnson",
    lastVisit: new Date("2023-05-18"),
    image: "/placeholder.svg?height=50&width=50",
    address: "0x...", // Add patient address
  },
]

// Doctor benefits data
const doctorBenefits = [
  {
    icon: <Heart className="size-6 text-red-500" />,
    title: "Patient Care",
    description: "Access to comprehensive patient histories",
  },
  {
    icon: <Shield className="size-6 text-blue-500" />,
    title: "Secure Platform",
    description: "HIPAA-compliant data management",
  },
  {
    icon: <Zap className="size-6 text-yellow-500" />,
    title: "Efficient Scheduling",
    description: "Smart appointment management system",
  },
]

export default function DoctorProfile() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [medicalContract, setMedicalContract] = useState<ethers.Contract | null>(null)
  const [doctor, setDoctor] = useState<any>(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [balance, setBalance] = useState(0)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const { toast } = useToast()

  // Registration form state
  const [name, setName] = useState("")
  const [speciality, setSpeciality] = useState("")
  const [fees, setFees] = useState("")

  // Prescription form state
  const [patientAddress, setPatientAddress] = useState("")
  const [medicationName, setMedicationName] = useState("")
  const [dosage, setDosage] = useState("")
  const [duration, setDuration] = useState("")
  const [additionalInstructions, setAdditionalInstructions] = useState("")
  const [diagnosis, setDiagnosis] = useState("")

  useEffect(() => {
    const init = async () => {
      try {
        const contract = await getMedicalContract()
        setMedicalContract(contract)
        const signer = await getSigner()
        if (contract && signer) {
          const doctorAddress = await signer.getAddress()
          const doctorData = await contract.doctors(doctorAddress)
          if (doctorData.verified) {
            const formattedBalance = parseFloat(ethers.formatUnits(doctorData.tokenBalance, 18))
            setDoctor({
              name: doctorData.name,
              specialty: doctorData.speciality,
              fees: ethers.formatUnits(doctorData.fees, 18),
              tokenBalance: formattedBalance,
              doctorAddress: doctorData.doctorAddress,
              email: "jane.smith@example.com", // Mock data
              phoneNumber: "+1 (555) 987-6543", // Mock data
              experience: 15, // Mock data
              rating: 4.8, // Mock data
              qualifications: ["MBBS", "MD", "FACC"], // Mock data
              image: "/placeholder.svg?height=100&width=100", // Mock data
            })
            setIsRegistered(true)
            setBalance(formattedBalance)
          }
        }
      } catch (error) {
        console.error("Error initializing doctor profile:", error)
        toast({
          title: "Error",
          description: "Failed to load doctor profile.",
          variant: "destructive",
        })
      }
    }
    init()
  }, [toast])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
  }

  const handleRegister = async () => {
    if (medicalContract && name && speciality && fees) {
      try {
        const feesInWei = ethers.parseUnits(fees, 18)
        const tx = await medicalContract.registerDoctor(name, speciality, feesInWei)
        await tx.wait()
        toast({
          title: "Success",
          description: "You have been registered successfully.",
        })
        // Refresh data
        const signer = await getSigner()
        if (signer) {
          const doctorAddress = await signer.getAddress()
          const doctorData = await medicalContract.doctors(doctorAddress)
          const formattedBalance = parseFloat(ethers.formatUnits(doctorData.tokenBalance, 18))
          setDoctor({
            name: doctorData.name,
            specialty: doctorData.speciality,
            fees: ethers.formatUnits(doctorData.fees, 18),
            tokenBalance: formattedBalance,
            doctorAddress: doctorData.doctorAddress,
            email: "jane.smith@example.com",
            phoneNumber: "+1 (555) 987-6543",
            experience: 15,
            rating: 4.8,
            qualifications: ["MBBS", "MD", "FACC"],
            image: "/placeholder.svg?height=100&width=100",
          })
          setIsRegistered(true)
          setBalance(formattedBalance)
        }
      } catch (error: any) {
        console.error("Registration failed:", error)
        toast({
          title: "Registration Failed",
          description: error.message || "An error occurred during registration.",
          variant: "destructive",
        })
      }
    }
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    if (!isNaN(amount) && amount > 0 && medicalContract) {
      try {
        const amountInWei = ethers.parseUnits(withdrawAmount, 18)
        const tx = await medicalContract.withdrawTokens(amountInWei)
        await tx.wait()
        toast({
          title: "Success",
          description: "Withdrawal successful.",
        })
        // Refresh balance
        const signer = await getSigner()
        if (signer) {
          const doctorAddress = await signer.getAddress()
          const doctorData = await medicalContract.doctors(doctorAddress)
          setBalance(parseFloat(ethers.formatUnits(doctorData.tokenBalance, 18)))
        }
        setWithdrawAmount("")
      } catch (error: any) {
        console.error("Withdrawal failed:", error)
        toast({
          title: "Withdrawal Failed",
          description: error.message || "An error occurred during withdrawal.",
          variant: "destructive",
        })
      }
    }
  }

  const handleIssuePrescription = async () => {
    if (medicalContract && patientAddress && medicationName && dosage && duration && diagnosis) {
      try {
        const medications = [{
          name: medicationName,
          dosage,
          duration: parseInt(duration),
          additionalInstructions,
        }]
        const tx = await medicalContract.issuePrescription(patientAddress, medications, diagnosis)
        await tx.wait()
        toast({
          title: "Success",
          description: "Prescription issued successfully.",
        })
        // Clear form
        setPatientAddress("")
        setMedicationName("")
        setDosage("")
        setDuration("")
        setAdditionalInstructions("")
        setDiagnosis("")
      } catch (error: any) {
        console.error("Failed to issue prescription:", error)
        toast({
          title: "Failed to Issue Prescription",
          description: error.message || "An error occurred.",
          variant: "destructive",
        })
      }
    }
  }

  if (!isRegistered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Register as a Doctor</CardTitle>
            <CardDescription>
              Join our platform to manage your patients and earnings securely.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Speciality" value={speciality} onChange={(e) => setSpeciality(e.target.value)} />
            <Input type="number" placeholder="Consultation Fees (in HTK)" value={fees} onChange={(e) => setFees(e.target.value)} />
          </CardContent>
          <CardFooter>
            <Button onClick={handleRegister} className="w-full">Register</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark" : ""}`}>
      <div className="container mx-auto space-y-6 bg-background p-6 text-foreground transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 flex items-center justify-between"
        >
          <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
          <Button variant="outline" size="icon" onClick={toggleDarkMode}>
            {isDarkMode ? (
              <Sun className="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            ) : (
              <Moon className="size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </motion.div>

        {doctor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="relative flex justify-between">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <Icons.logo className="size-2/3 opacity-20 duration-300 hover:animate-pulse" />
              </div>
              <div>
                <CardHeader className="flex flex-row items-center space-x-4">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Avatar className="size-20">
                      <AvatarImage src={doctor.image} alt={doctor.name} />
                      <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </motion.div>
                  <div>
                    <CardTitle className="text-2xl">{doctor.name}</CardTitle>
                    <CardDescription>{doctor.specialty}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <InfoItem
                    icon={<Mail className="text-green-500 dark:text-green-400" />}
                    label="Email"
                    value={doctor.email}
                  />
                  <InfoItem
                    icon={<Phone className="text-blue-500 dark:text-blue-400" />}
                    label="Phone"
                    value={doctor.phoneNumber}
                  />
                  <InfoItem
                    icon={
                      <Briefcase className="text-purple-500 dark:text-purple-400" />
                    }
                    label="Experience"
                    value={`${doctor.experience} years`}
                  />
                  <div>
                    <h3 className="mb-2 text-lg font-semibold">Qualifications</h3>
                    <div className="flex flex-wrap gap-2">
                      {doctor.qualifications.map((qual: string, index: number) => (
                        <motion.div
                          key={index}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Badge
                            variant="secondary"
                            className="bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                          >
                            {qual}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="text-yellow-500" />
                    <span className="font-semibold">{doctor.rating}</span>
                    <span className="text-muted-foreground">
                      ({Math.floor(Math.random() * 500) + 100} reviews)
                    </span>
                  </div>
                </CardContent>
              </div>
              <Image
                src="/illustrations/doctor-3.svg"
                alt="Health Journey Visualization"
                width={400}
                height={300}
                className="hidden rounded-lg shadow-lg lg:block"
              />
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Platform Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {doctorBenefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                    className="flex flex-col items-center rounded-lg bg-secondary p-4 text-center"
                  >
                    {benefit.icon}
                    <h3 className="mt-2 font-semibold">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Issue Prescription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Patient Address" value={patientAddress} onChange={(e) => setPatientAddress(e.target.value)} />
                <Input placeholder="Diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                <Input placeholder="Medication Name" value={medicationName} onChange={(e) => setMedicationName(e.target.value)} />
                <Input placeholder="Dosage (e.g., 500mg)" value={dosage} onChange={(e) => setDosage(e.target.value)} />
                <Input type="number" placeholder="Duration (in days)" value={duration} onChange={(e) => setDuration(e.target.value)} />
                <Input placeholder="Additional Instructions" value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} />
                <Button onClick={handleIssuePrescription} className="w-full">Issue Prescription</Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center text-3xl font-bold">
                    <DollarSign className="mr-2 text-green-500 dark:text-green-400" />
                    {balance.toFixed(2)} HTK
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-24"
                    />
                    <Button
                      onClick={handleWithdraw}
                      className="bg-green-500 text-white hover:bg-green-600"
                    >
                      Withdraw
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <motion.div
      className="flex items-center space-x-2"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {icon}
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
    </motion.div>
  )
}
