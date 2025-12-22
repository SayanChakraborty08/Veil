"use client"

import { useState } from "react"
import { getMedicalContract, getSigner } from "@/lib/web3"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { getCsrfToken, signIn } from "next-auth/react"
import { SiweMessage } from "siwe"
import { useAccount, useConnect, useNetwork, useSignMessage } from "wagmi"
import { InjectedConnector } from "wagmi/connectors/injected"
import { getEthersSigner } from "@/lib/ethers-wagmi-adapter"

export default function RegisterPatient() {
  const [name, setName] = useState("")
  const { toast } = useToast()

  const { connectAsync } = useConnect()
  const { chain } = useNetwork()
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const handleRegister = async () => {
    if (!name) {
      toast({
        title: "Error",
        description: "Name is required.",
        variant: "destructive",
      })
      return
    }
    try {
      const medicalContract = await getMedicalContract()
      const tx = await medicalContract.registerPatient(name)
      await tx.wait()
      toast({
        title: "Success",
        description: "You have been registered successfully as a patient.",
      })
    } catch (error: any) {
      console.error("Registration failed:", error)
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration.",
        variant: "destructive",
      })
    }
  }

  const handleLogin = async () => {
    try {
      await connectAsync({ connector: new InjectedConnector() })
      const signer = await getEthersSigner({ chainId: chain?.id })
      if (!signer) {
        throw new Error("Could not get signer")
      }
      const message = new SiweMessage({
        domain: window.location.host,
        address: await signer.getAddress(),
        statement: "Sign in with Ethereum to the app.",
        uri: window.location.origin,
        version: "1",
        chainId: chain?.id,
        nonce: await getCsrfToken(),
      })
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      })
      const response = await signIn("credentials", {
        message: JSON.stringify(message),
        redirect: true,
        signature,
        callbackUrl: "/dashboard",
      })
      if (response?.error) {
        toast({
          title: "Login Failed",
          description: response.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "You have been logged in successfully.",
        })
      }
    } catch (error: any) {
      console.error("Login failed:", error)
      toast({
        title: "Login Failed",
        description: error.message || "An error occurred during login.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Register as a Patient</CardTitle>
          <CardDescription>
            Join our platform to manage your health records securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button onClick={handleRegister} className="w-full">
            Register
          </Button>
          <Button onClick={handleLogin} className="w-full" variant="outline">
            Login with Wallet
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
