import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Loader2, Plus } from "lucide-react";

import { getHealthTokenContract, getMedicalContract, getSigner } from "@/lib/web3";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

export const HealthTokenBalance = () => {
  const [balance, setBalance] = useState<string>("0");
  const [topUpAmount, setTopUpAmount] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [healthTokenContract, setHealthTokenContract] = useState<ethers.Contract | null>(null);
  const [medicalContract, setMedicalContract] = useState<ethers.Contract | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initializeContracts = async () => {
      try {
        const htContract = await getHealthTokenContract();
        setHealthTokenContract(htContract);

        const medContract = await getMedicalContract();
        setMedicalContract(medContract);

        const signer = await getSigner();
        if (signer) {
            await fetchBalance(htContract, signer);
        }

        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on("accountsChanged", () => initializeContracts());
        }
      } catch (error) {
        console.error("Initialization error:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to the blockchain.",
          variant: "destructive",
        });
      }
    };

    initializeContracts();

    return () => {
      // Clean up listeners
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
      }
    };
  }, [toast]);

  const fetchBalance = async (
    tokenContract: ethers.Contract,
    signer: ethers.Signer
  ) => {
    try {
      const address = await signer.getAddress();
      const balanceWei = await tokenContract.balanceOf(address);
      const balanceEth = ethers.formatEther(balanceWei);
      setBalance(balanceEth);
    } catch (error) {
      console.error("Balance fetch error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch token balance.",
        variant: "destructive",
      });
    }
  };

  const handleTopUp = async () => {
    if (!healthTokenContract || !topUpAmount || parseFloat(topUpAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to top up.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const ethAmount = ethers.parseEther(topUpAmount);
      // This assumes the HealthToken contract has a payable function to buy tokens.
      // Based on the provided contracts, HealthToken.sol does not have a buyTokens function.
      // I will assume there is a mechanism to get tokens, e.g., via a faucet or direct transfer for this example.
      // If the intention is to buy tokens with ETH, the HealthToken contract needs a `buyTokens` or similar payable function.
      // For now, I'll simulate a transfer from an admin/faucet account which is not implemented here.
      // A more realistic scenario would be to call a function on the HealthToken contract.
      // Call buyTokens function with ETH payment (1 ETH = 100 HTK tokens)
      console.log("🚀 Calling buyTokens with", topUpAmount, "ETH...");
      const tx = await healthTokenContract.buyTokens({ value: ethAmount });
      
      toast({
        title: "Transaction Submitted",
        description: "Please wait for the transaction to be confirmed...",
      });
      
      await tx.wait();

      toast({
        title: "Tokens Purchased Successfully",
        description: `You have purchased ${parseFloat(topUpAmount) * 100} HTK tokens for ${topUpAmount} ETH`,
      });

      const signer = await getSigner();
      if (signer) {
        await fetchBalance(healthTokenContract, signer);
      }

      setTopUpAmount("");
      // toast({
      //   title: "Success",
      //   description: `Successfully topped up ${topUpAmount} ETH worth of HTK tokens.`,
      // });
    } catch (error: any) {
      console.error("Top up error:", error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to top up tokens.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSpending = async () => {
    if (!healthTokenContract || !medicalContract) return;

    setLoading(true);
    try {
      const medicalContractAddress = await medicalContract.getAddress();
      const amount = ethers.parseEther("1000000"); // Large approval amount
      const tx = await healthTokenContract.approve(medicalContractAddress, amount);
      await tx.wait();
      toast({
        title: "Success",
        description: "Spending approved for medical contract.",
      });
    } catch (error: any) {
      console.error("Approval error:", error);
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve token spending.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="size-full">
      <CardHeader>
        <CardTitle>HTK Token Balance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Balance:</span>
          <span className="text-lg font-bold">
            {parseFloat(balance).toFixed(2)} HTK
          </span>
        </div>

        <div className="flex space-x-2">
          <Input
            type="number"
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(e.target.value)}
            placeholder="Amount in ETH"
            className="flex-1"
            min="0"
            step="0.01"
          />
          <Button
            onClick={handleTopUp}
            className="bg-green-500 text-white hover:bg-green-600"
            disabled={loading || !topUpAmount}
          >
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            Buy HTK
          </Button>
        </div>

        <Button
          onClick={handleApproveSpending}
          className="w-full"
          variant="outline"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            "Approve Medical Contract"
          )}
        </Button>
        <div className="mt-2 text-xs text-muted-foreground">
          Rate: 1 ETH = 100 HTK tokens
        </div>
      </CardContent>
    </Card>
  );
};
