"use client"

import Image from "next/image"
import { PatientDashboardData } from "@/types"
import { motion } from "framer-motion"
import {
  Activity,
  Calendar,
  Droplet,
  Heart,
  Mail,
  Phone,
  Shield,
  User,
  Zap,
  Wallet,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  Lock,
  Key,
} from "lucide-react"
import { useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

import { HealthTokenBalance } from "./token-operations"

export default function PatientProfile({
  patientData,
}: {
  patientData: PatientDashboardData
}) {

  console.log("Rendering PatientProfile with data:", patientData)
  const [showFullAddress, setShowFullAddress] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(38)}`
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Address copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy address to clipboard",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-6">
        {/* Anonymous Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="relative">
            <div className="absolute right-4 top-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Anonymous Profile
              </Badge>
            </div>
            <CardHeader className="flex flex-row items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Avatar className="size-20 bg-gradient-to-r from-blue-500 to-purple-600">
                  <AvatarFallback className="bg-transparent text-white font-bold text-xl">
                    <User className="w-10 h-10" />
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Lock className="w-5 h-5 text-green-500" />
                  Patient #{patientData.blockId.substring(38)}
                </CardTitle>
                <CardDescription className="text-sm">
                  Privacy-protected blockchain identity
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Blockchain Identity Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-500" />
                Blockchain Identity
              </CardTitle>
              <CardDescription>
                Your anonymous blockchain credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoItem
                icon={<Key className="text-blue-500" />}
                label="Block ID"
                value={
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {showFullAddress ? patientData.blockId : truncateAddress(patientData.blockId)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFullAddress(!showFullAddress)}
                    >
                      {showFullAddress ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(patientData.blockId)}
                    >
                      {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                }
              />
              <InfoItem
                icon={<Shield className="text-green-500" />}
                label="Registration Status"
                value={
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified on Blockchain
                  </Badge>
                }
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Medical Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Medical Information
              </CardTitle>
              <CardDescription>
                Your health data and medical profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoItem
                icon={<Droplet className="text-red-500" />}
                label="Blood Type"
                value={
                  <Badge variant="outline" className="text-red-600 border-red-200">
                    {patientData.bloodType && patientData.bloodType !== "Not specified" ? patientData.bloodType : "Not available"}
                  </Badge>
                }
              />
              <InfoItem
                icon={<Calendar className="text-blue-500" />}
                label="Date of Birth"
                value={
                  <span className="text-sm">
                    {patientData.dateOfBirth && patientData.dateOfBirth.getTime() > 0 ? 
                      new Date(patientData.dateOfBirth).toLocaleDateString() : 
                      "Not available"
                    }
                  </span>
                }
              />
              <InfoItem
                icon={<User className="text-purple-500" />}
                label="Gender"
                value={
                  <Badge variant="outline" className="text-purple-600 border-purple-200">
                    {patientData.gender && patientData.gender !== "Not specified" ? patientData.gender : "Not available"}
                  </Badge>
                }
              />
              <InfoItem
                icon={<Phone className="text-green-500" />}
                label="Emergency Contact"
                value={
                  <span className="text-sm font-mono">
                    {patientData.emergencyContact && patientData.emergencyContact !== "Not provided" ? patientData.emergencyContact : "Not available"}
                  </span>
                }
              />
              <div className="mt-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="w-4 h-4 text-orange-500" />
                  <span className="font-medium">Chronic Diseases:</span>
                </div>
                <div className="ml-6">
                  {patientData.chronicDiseases && patientData.chronicDiseases.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patientData.chronicDiseases.map((disease, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-orange-600 border-orange-200"
                        >
                          {disease}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No chronic diseases recorded
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="space-y-6">
        <HealthTokenBalance />
      </div>
    </div>
  )
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | React.ReactNode
}) {
  return (
    <motion.div
      className="flex items-center space-x-2"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {icon}
      <span className="font-medium">{label}:</span>
      <div className="flex items-center">{value}</div>
    </motion.div>
  )
}

function PrivacyFeature({
  icon,
  title,
  description,
  active,
}: {
  icon: React.ReactNode
  title: string
  description: string
  active: boolean
}) {
  return (
    <motion.div
      className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{title}</h4>
          {active && (
            <Badge variant="outline" className="text-green-600 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Active
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </motion.div>
  )
}
