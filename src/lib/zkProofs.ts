import { ethers } from 'ethers';

// ZoKrates proof generation utilities
export interface ZKProofData {
  proof: {
    a: [string, string];
    b: [[string, string], [string, string]];
    c: [string, string];
  };
  inputs: string[];
}

export interface AnonymousPrescriptionData {
  medications: Array<{
    name: string;
    dosage: string;
    duration: string;
    additionalInstructions: string;
  }>;
  diagnosis: string;
  doctorId: string;
  secretKey: string;
}

// Generate a commitment hash for the prescription
export function generateCommitment(
  prescriptionData: AnonymousPrescriptionData
): string {
  // Create a deterministic hash of the prescription data
  const dataString = JSON.stringify({
    medications: prescriptionData.medications,
    diagnosis: prescriptionData.diagnosis,
    doctorId: prescriptionData.doctorId,
    timestamp: Math.floor(Date.now() / 1000) // Use current timestamp
  });
  
  const prescriptionHash = ethers.keccak256(ethers.toUtf8Bytes(dataString));
  
  // Combine with secret key to create commitment
  const commitment = ethers.keccak256(
    ethers.solidityPacked(
      ['bytes32', 'bytes32'],
      [prescriptionHash, ethers.keccak256(ethers.toUtf8Bytes(prescriptionData.secretKey))]
    )
  );
  
  return commitment;
}

// Convert hex string to array of 32-bit integers (for ZoKrates)
export function hexToU32Array(hex: string): number[] {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  
  // Pad to 64 characters (256 bits)
  const paddedHex = cleanHex.padStart(64, '0');
  
  // Split into 8 chunks of 8 characters each (32 bits)
  const chunks: number[] = [];
  for (let i = 0; i < 64; i += 8) {
    const chunk = paddedHex.slice(i, i + 8);
    chunks.push(parseInt(chunk, 16));
  }
  
  return chunks;
}

// Generate witness input for ZoKrates circuit
export function generateWitnessInput(prescriptionData: AnonymousPrescriptionData): any {
  // Generate prescription hash
  const dataString = JSON.stringify({
    medications: prescriptionData.medications,
    diagnosis: prescriptionData.diagnosis,
    doctorId: prescriptionData.doctorId,
  });
  
  const prescriptionHashHex = ethers.keccak256(ethers.toUtf8Bytes(dataString));
  const secretKeyHash = ethers.keccak256(ethers.toUtf8Bytes(prescriptionData.secretKey));
  const doctorIdHash = ethers.keccak256(ethers.toUtf8Bytes(prescriptionData.doctorId));
  
  // Convert to u32 arrays for ZoKrates
  const prescriptionHashU32 = hexToU32Array(prescriptionHashHex);
  const secretKeyU32 = parseInt(secretKeyHash.slice(2, 10), 16); // Take first 32 bits
  const doctorIdU32 = parseInt(doctorIdHash.slice(2, 10), 16); // Take first 32 bits
  
  // Generate public commitment
  const commitment = generateCommitment(prescriptionData);
  const commitmentU32 = hexToU32Array(commitment);
  
  return {
    prescription_hash: prescriptionHashU32,
    secret_key: secretKeyU32,
    doctor_id: doctorIdU32,
    public_commitment: commitmentU32
  };
}

// Mock ZK proof generation (in a real implementation, you'd use ZoKrates.js)
export async function generateZKProof(prescriptionData: AnonymousPrescriptionData): Promise<ZKProofData> {
  // In a real implementation, this would:
  // 1. Generate witness using ZoKrates
  // 2. Generate proof using the compiled circuit
  // 3. Return the actual proof data
  
  console.log('Generating ZK proof for prescription...');
  
  // For now, return mock proof data
  const mockProof: ZKProofData = {
    proof: {
      a: ["0x1234", "0x5678"],
      b: [["0xabcd", "0xef01"], ["0x2345", "0x6789"]],
      c: ["0x9abc", "0xdef0"]
    },
    inputs: [generateCommitment(prescriptionData)]
  };
  
  // Simulate async proof generation
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return mockProof;
}

// Verify ZK proof (client-side verification)
export async function verifyZKProof(proof: ZKProofData): Promise<boolean> {
  // In a real implementation, this would verify the proof using ZoKrates verification key
  console.log('Verifying ZK proof...');
  
  // Mock verification - always returns true for demo
  await new Promise(resolve => setTimeout(resolve, 500));
  return true;
}

// Generate a random secret key for the user
export function generateSecretKey(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}

// Parse commitment into format expected by smart contract
export function parseCommitmentForContract(commitment: string): number[] {
  return hexToU32Array(commitment);
}
