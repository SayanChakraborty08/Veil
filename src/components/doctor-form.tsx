"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { MedicalContract } from "./contract"
import NavBar from "./metamask"
import { toast } from "./ui/use-toast"

const FormSchema = z.object({
  name: z.string().min(4, {
    message: "Name must be atleast 4 characters",
  }),
  phoneNumber: z.string().min(10, {
    message: "Phone number must be at least 10 digits.",
  }),
  aadharNumber: z.string().min(12, {
    message: "Aadhar number must be 12 digits.",
  }),
  mbbsId: z.string().min(1, {
    message: "MBBS ID is required.",
  }),
  specialty: z.string().min(1, {
    message: "Specialty is required.",
  }),
  blockId: z.string().startsWith("0x", {
    message: "Invalid account address.",
  }),
  fees: z
    .number()
    .min(1, {
      message: "Fees too low!",
    })
    .max(100, {
      message: "Fees more than 1 ETH not allowed!",
    }),
})

type FormData = z.infer<typeof FormSchema>

interface DoctorFormProps extends React.HTMLAttributes<typeof Form> {
  userId: string
}

export function DoctorForm({ ...props }: DoctorFormProps) {
  const [address, setAddress] = useState("")
  const router = useRouter()
  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      aadharNumber: "",
      mbbsId: "",
      specialty: "",
      blockId: "",
    },
  })

  async function onSubmit(data: FormData) {
    console.log(data)
    try {
      // Try blockchain registration first
      const contract = new MedicalContract(data.blockId)
      await contract.init()
      await contract.registerDoctor(data.name, data.specialty, data.fees)
      
      // If blockchain registration succeeds, proceed with database registration
      const res = await axios.post("/api/users/doctor", {
        ...data,
        userId: props.userId,
      })
      
      if (res.status !== 200) {
        return toast({
          title: "Database Registration Failed",
          description: "Blockchain registration succeeded but database registration failed. Please contact support.",
          variant: "destructive",
        })
      }

      toast({
        title: "Success!",
        description: "Doctor registration completed successfully.",
      })

      router.push("/doctor")
    } catch (error: any) {
      console.error("Registration error:", error)
      
      // Check if it's a "Doctor already registered" error
      const isAlreadyRegistered = error?.data?.message?.includes("Doctor already registered")
      
      if (isAlreadyRegistered) {
        // If doctor is already registered on blockchain, try to register in database only
        try {
          const res = await axios.post("/api/users/doctor", {
            ...data,
            userId: props.userId,
          })
          
          if (res.status === 200) {
            toast({
              title: "Registration Completed",
              description: "You were already registered on blockchain. Database registration completed.",
            })
            router.push("/doctor")
          } else {
            toast({
              title: "Registration Issue",
              description: "You're already registered on blockchain, but database registration failed.",
              variant: "destructive",
            })
          }
        } catch (dbError) {
          console.error("Database registration error:", dbError)
          toast({
            title: "Registration Failed",
            description: "You're already registered on blockchain, but database registration failed.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Registration Failed",
          description: `Failed to register: ${error?.message || "Unknown error"}`,
          variant: "destructive",
        })
      }
    }
  }

  useEffect(() => {
    if (address) form.setValue("blockId", address)
  }, [address])

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-[500px] max-w-full space-y-6 p-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter your username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter phone number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="aadharNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aadhar Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter Aadhar number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="mbbsId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>MBBS ID</FormLabel>
              <FormControl>
                <Input placeholder="Enter MBBS ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="specialty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specialty</FormLabel>
              <FormControl>
                <Input placeholder="Enter specialty" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fees"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fees</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter your fees (100 unit = 1 ETH)"
                  onChange={(e) => {
                    form.setValue("fees", Number.parseFloat(e.target.value))
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="blockId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Block ID</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input placeholder="Account address" {...field} disabled />
                  <NavBar setAddress={setAddress} />
                </div>
              </FormControl>
              <FormDescription>*You cannot change this later</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Submit
        </Button>
      </form>
    </Form>
  )
}
