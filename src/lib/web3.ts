import { ethers } from "ethers";
import MedicalContract from "@/contracts/Medical.json";
import MedicalWithZKContract from "@/contracts/MedicalWithZK.json";
import ZKPrescriptionVerifierContract from "@/contracts/ZKPrescriptionVerifier.json";
import HealthTokenContract from "@/contracts/HealthToken.json";

const MEDICAL_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MEDICAL_CONTRACT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const MEDICAL_ZK_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MEDICAL_ZK_CONTRACT_ADDRESS || "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const ZK_VERIFIER_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ZK_VERIFIER_CONTRACT_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const HEALTHTOKEN_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HEALTHTOKEN_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Check if we're in the browser
const isBrowser = typeof window !== "undefined";

export const getProvider = () => {
  if (isBrowser && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  // Fallback to a public provider if no wallet is present
  return ethers.getDefaultProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545/");
};

export const getSigner = async () => {
  if (!isBrowser || !window.ethereum) {
    throw new Error("Wallet not available. Please install MetaMask.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  
  // Request account access if needed
  try {
    await provider.send("eth_requestAccounts", []);
    return await provider.getSigner();
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error("Please connect your wallet to continue.");
    }
    throw new Error("Failed to connect to wallet.");
  }
};

export const connectWallet = async () => {
  if (!isBrowser || !window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    return { provider, signer, address };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error("Please connect your wallet to continue.");
    }
    throw new Error("Failed to connect to wallet: " + error.message);
  }
};

export const getMedicalContract = async (signerRequired = true) => {
  try {
    if (signerRequired) {
      const signer = await getSigner();
      return new ethers.Contract(MEDICAL_CONTRACT_ADDRESS, MedicalContract.abi, signer);
    } else {
      const provider = getProvider();
      return new ethers.Contract(MEDICAL_CONTRACT_ADDRESS, MedicalContract.abi, provider);
    }
  } catch (error) {
    console.error("Error getting medical contract:", error);
    throw error;
  }
};

export const getMedicalWithZKContract = async (signerRequired = true) => {
  try {
    if (signerRequired) {
      const signer = await getSigner();
      return new ethers.Contract(MEDICAL_ZK_CONTRACT_ADDRESS, MedicalWithZKContract.abi, signer);
    } else {
      const provider = getProvider();
      return new ethers.Contract(MEDICAL_ZK_CONTRACT_ADDRESS, MedicalWithZKContract.abi, provider);
    }
  } catch (error) {
    console.error("Error getting medical ZK contract:", error);
    throw error;
  }
};

export const getZKVerifierContract = async (signerRequired = true) => {
  try {
    if (signerRequired) {
      const signer = await getSigner();
      return new ethers.Contract(ZK_VERIFIER_CONTRACT_ADDRESS, ZKPrescriptionVerifierContract.abi, signer);
    } else {
      const provider = getProvider();
      return new ethers.Contract(ZK_VERIFIER_CONTRACT_ADDRESS, ZKPrescriptionVerifierContract.abi, provider);
    }
  } catch (error) {
    console.error("Error getting ZK verifier contract:", error);
    throw error;
  }
};

export const getHealthTokenContract = async (signerRequired = true) => {
  try {
    if (signerRequired) {
      const signer = await getSigner();
      return new ethers.Contract(HEALTHTOKEN_CONTRACT_ADDRESS, HealthTokenContract.abi, signer);
    } else {
      const provider = getProvider();
      return new ethers.Contract(HEALTHTOKEN_CONTRACT_ADDRESS, HealthTokenContract.abi, provider);
    }
  } catch (error) {
    console.error("Error getting health token contract:", error);
    throw error;
  }
};

// Utility function to check if user has MetaMask
export const hasMetaMask = () => {
  return isBrowser && !!window.ethereum;
};

// Utility function to get current account
export const getCurrentAccount = async () => {
  if (!hasMetaMask()) {
    throw new Error("MetaMask not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum!);
  const accounts = await provider.listAccounts();
  return accounts.length > 0 ? accounts[0].address : null;
};
