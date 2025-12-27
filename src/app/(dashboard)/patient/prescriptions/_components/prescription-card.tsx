"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ethers } from "ethers"
import { motion } from "framer-motion"
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ExternalLink,
  Pill,
  User,
  Shield,
  Database,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

import { getMedicalContract } from "@/lib/web3"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface PrescriptionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  prescription: any
  colorScheme: ColorScheme
}

interface ColorScheme {
  primary: string
  secondary: string
  text: string
}

export function PrescriptionCard({
  prescription,
  colorScheme,
}: PrescriptionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [doctorFee, setDoctorFee] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchDoctorFee = async () => {
      try {
        const medicalContract = await getMedicalContract()
        const fee = await medicalContract.getDoctorFee(prescription.doctorAddress)
        setDoctorFee(ethers.formatUnits(fee, 18))
      } catch (error) {
        console.error("Failed to fetch doctor fee:", error)
      }
    }
    fetchDoctorFee()
  }, [prescription.doctorAddress])

  const handlePayment = async () => {
    try {
      const medicalContract = await getMedicalContract()
      const feeInWei = ethers.parseUnits(doctorFee!, 18)
      const tx = await medicalContract.payDoctor(prescription.doctorAddress, feeInWei)
      await tx.wait()
      toast({
        title: "Success",
        description: "Payment successful.",
      })
    } catch (error: any) {
      console.error("Payment failed:", error)
      toast({
        title: "Payment Failed",
        description: error.message || "An error occurred during payment.",
        variant: "destructive",
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`${colorScheme.primary} border-none shadow-lg`}>
        <CardContent className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <h2 className={`text-2xl font-bold ${colorScheme.text}`}>
                  Prescription #{prescription.id}
                </h2>
                {prescription.blockchainOnly ? (
                  <Badge 
                    variant="outline" 
                    className="bg-purple-500/20 text-purple-100 border-purple-300"
                  >
                    <Shield className="mr-1 size-3" />
                    Blockchain
                  </Badge>
                ) : (
                  <Badge 
                    variant="outline" 
                    className="bg-gray-500/20 text-gray-100 border-gray-300"
                  >
                    <Database className="mr-1 size-3" />
                    Database
                  </Badge>
                )}
              </div>
              <div className="mb-2 flex items-center space-x-2">
                <Calendar className={`size-5 ${colorScheme.text}`} />
                <span className={`text-sm ${colorScheme.text}`}>
                  Issued: {prescription.issueDate.toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <User className={`size-5 ${colorScheme.text}`} />
                <span className={`text-sm ${colorScheme.text}`}>
                  Dr. {prescription.doctorAddress}
                </span>
              </div>
              {doctorFee && (
                <div className="mt-2 flex items-center space-x-2">
                  <DollarSign className={`size-5 ${colorScheme.text}`} />
                  <span className={`text-sm ${colorScheme.text}`}>
                    Fee: {doctorFee} HTK
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Link
                href={`/dashboard/prescriptions/${prescription.id}`}
                className={cn(
                  buttonVariants({
                    variant: "secondary",
                    size: "sm",
                    className: `${colorScheme.secondary} ${colorScheme.text}`,
                  })
                )}
              >
                <ExternalLink className="mr-2 size-4" />
                View Details
              </Link>
              {doctorFee && (
                <Button
                  onClick={handlePayment}
                  variant="secondary"
                  size="sm"
                  className={`${colorScheme.secondary} ${colorScheme.text}`}
                >
                  Pay Now
                </Button>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <QRCodeSVG
                      value={`/dashboard/prescriptions/${prescription.id}`}
                      size={64}
                      bgColor="transparent"
                      fgColor={colorScheme.text.replace("text-", "#")}
                      level="L"
                      marginSize={0}
                      className="cursor-help"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Scan using our mobile app</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="mb-4 flex items-center justify-between">
            <Badge
              variant="secondary"
              className={`${colorScheme.secondary} ${colorScheme.text}`}
            >
              {prescription.medications && prescription.medications.length > 0 
                ? `${prescription.medications.length} Medication(s)`
                : prescription.blockchainOnly 
                  ? "Medications on blockchain"
                  : "No medications"
              }
            </Badge>
            {prescription.medications && prescription.medications.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
                aria-controls={`prescription-${prescription.id}-medications`}
                className={colorScheme.text}
              >
                {isExpanded ? (
                  <ChevronUp className="size-5" />
                ) : (
                  <ChevronDown className="size-5" />
                )}
                <span className="hidden md:block">
                  {isExpanded ? "Hide" : "Show"} medications
                </span>
              </Button>
            )}
          </div>
          <motion.div
            initial={false}
            animate={{
              height: isExpanded ? "auto" : 0,
              opacity: isExpanded ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
            id={`prescription-${prescription.id}-medications`}
          >
            {prescription.medications && prescription.medications.length > 0 ? (
              <ul className="space-y-4">
                {prescription.medications.map((medication: any, index: number) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={`${colorScheme.secondary} rounded-lg p-4`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className={`text-lg font-semibold ${colorScheme.text}`}>
                        {medication.name}
                      </h3>
                      <Pill className={`size-5 ${colorScheme.text}`} />
                    </div>
                    <p className={`text-sm ${colorScheme.text}`}>
                      Dosage: {medication.dosage}
                    </p>
                    <p className={`text-sm ${colorScheme.text}`}>
                      Duration: {medication.duration} days
                    </p>
                    {medication.additionalInstructions && (
                      <p className={`text-sm ${colorScheme.text} mt-2`}>
                        Note: {medication.additionalInstructions}
                      </p>
                    )}
                  </motion.li>
                ))}
              </ul>
            ) : (
              <div className={`${colorScheme.secondary} rounded-lg p-4 text-center`}>
                <p className={`text-sm ${colorScheme.text}`}>
                  {prescription.blockchainOnly 
                    ? "Medication details are stored on the blockchain but not available in this view."
                    : "No medications prescribed."
                  }
                </p>
              </div>
            )}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
