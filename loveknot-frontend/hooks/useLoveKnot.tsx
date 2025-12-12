"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { LoveKnotAddresses } from "@/abi/LoveKnotAddresses";
import { LoveKnotABI } from "@/abi/LoveKnotABI";
import { stringToUint32Array, uint32ArrayToMessages } from "@/utils/messageEncoding";

export type MatchResultType = {
  handle: string;
  clear: number | null;
};

type LoveKnotInfoType = {
  abi: typeof LoveKnotABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getLoveKnotByChainId(
  chainId: number | undefined
): LoveKnotInfoType {
  if (!chainId) {
    return { abi: LoveKnotABI.abi };
  }

  const entry =
    LoveKnotAddresses[chainId.toString() as keyof typeof LoveKnotAddresses];

  if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: LoveKnotABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: LoveKnotABI.abi,
  };
}

// Helper function to convert address to uint32 (last 8 hex chars)
function addressToUint32(address: string): number {
  const addrUint = BigInt(address);
  return Number(addrUint & BigInt(0xFFFFFFFF));
}

export const useLoveKnot = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [matchResultHandle, setMatchResultHandle] = useState<string | undefined>(undefined);
  const [matchResult, setMatchResult] = useState<MatchResultType | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [remainingAttempts, setRemainingAttempts] = useState<number | undefined>(undefined);
  const [nextSubmissionTime, setNextSubmissionTime] = useState<number | undefined>(undefined);

  const loveKnotRef = useRef<LoveKnotInfoType | undefined>(undefined);
  const isSubmittingRef = useRef<boolean>(isSubmitting);
  const isCheckingRef = useRef<boolean>(isChecking);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isSendingMessageRef = useRef<boolean>(false);
  const isLoadingMessagesRef = useRef<boolean>(false);

  const loveKnot = useMemo(() => {
    const c = getLoveKnotByChainId(chainId);
    loveKnotRef.current = c;

    // Only show error if chainId is defined but no address found
    // If chainId is undefined, it means it's still loading, don't show error
    if (chainId !== undefined && !c.address) {
      setMessage(`LoveKnot deployment not found for chainId=${chainId}.`);
    } else if (chainId === undefined) {
      // Clear message when chainId is loading
      setMessage("");
    }

    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!loveKnot) {
      return undefined;
    }
    // If chainId is undefined, we're still loading, return undefined
    if (chainId === undefined) {
      return undefined;
    }
    // Only return false if chainId is defined but no address found
    return Boolean(loveKnot.address) && loveKnot.address !== ethers.ZeroAddress;
  }, [loveKnot, chainId]);

  const canSubmitCrush = useMemo(() => {
    return (
      loveKnot.address &&
      instance &&
      ethersSigner &&
      !isSubmitting &&
      !isChecking
    );
  }, [loveKnot.address, instance, ethersSigner, isSubmitting, isChecking]);

  const canCheckMatch = useMemo(() => {
    return (
      loveKnot.address &&
      instance &&
      ethersSigner &&
      !isSubmitting &&
      !isChecking &&
      !isDecrypting
    );
  }, [loveKnot.address, instance, ethersSigner, isSubmitting, isChecking, isDecrypting]);

  const canDecrypt = useMemo(() => {
    return (
      loveKnot.address &&
      instance &&
      ethersSigner &&
      !isDecrypting &&
      matchResultHandle &&
      matchResultHandle !== ethers.ZeroHash &&
      matchResultHandle !== matchResult?.handle
    );
  }, [
    loveKnot.address,
    instance,
    ethersSigner,
    isDecrypting,
    matchResultHandle,
    matchResult,
  ]);

  const submitCrush = useCallback(
    (targetAddress: string) => {
      if (isSubmittingRef.current || isCheckingRef.current) {
        return;
      }

      if (!loveKnot.address || !instance || !ethersSigner) {
        return;
      }

      if (!ethers.isAddress(targetAddress)) {
        setMessage("Invalid address format");
        return;
      }

      const thisChainId = chainId;
      const thisLoveKnotAddress = loveKnot.address;
      const thisEthersSigner = ethersSigner;
      const targetUint32 = addressToUint32(targetAddress);

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setMessage("Encrypting target address...");

      const run = async () => {
        const isStale = () =>
          thisLoveKnotAddress !== loveKnotRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          await new Promise((resolve) => setTimeout(resolve, 100));

          const input = instance.createEncryptedInput(
            thisLoveKnotAddress,
            thisEthersSigner.address
          );
          input.add32(targetUint32);

          const enc = await input.encrypt();

          if (isStale()) {
            setMessage("Ignore submitCrush");
            return;
          }

          setMessage("Submitting crush target...");

          const contract = new ethers.Contract(
            thisLoveKnotAddress,
            loveKnot.abi,
            thisEthersSigner
          );

          const tx: ethers.TransactionResponse = await contract.submitCrush(
            enc.handles[0],
            enc.inputProof
          );

          setMessage(`Waiting for tx: ${tx.hash}...`);

          const receipt = await tx.wait();

          setMessage(`Submit crush completed! status=${receipt?.status}`);

          if (isStale()) {
            setMessage("Ignore submitCrush");
            return;
          }

          // Refresh remaining attempts
          refreshRemainingAttempts();
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          setMessage(`Submit crush failed: ${error.message}`);
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      loveKnot.address,
      loveKnot.abi,
      instance,
      chainId,
      sameChain,
      sameSigner,
    ]
  );

  const checkMatch = useCallback(
    (otherUserAddress: string) => {
      if (isCheckingRef.current || isSubmittingRef.current) {
        return;
      }

      if (!loveKnot.address || !instance || !ethersSigner) {
        return;
      }

      if (!ethers.isAddress(otherUserAddress)) {
        setMessage("Invalid address format");
        return;
      }

      const thisChainId = chainId;
      const thisLoveKnotAddress = loveKnot.address;
      const thisEthersSigner = ethersSigner;

      isCheckingRef.current = true;
      setIsChecking(true);
      setMessage("Checking match...");

      const run = async () => {
        const isStale = () =>
          thisLoveKnotAddress !== loveKnotRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const contract = new ethers.Contract(
            thisLoveKnotAddress,
            loveKnot.abi,
            thisEthersSigner
          );

          const tx = await contract.checkMatch(otherUserAddress);
          setMessage(`Waiting for tx: ${tx.hash}...`);

          await tx.wait();

          if (isStale()) {
            setMessage("Ignore checkMatch");
            return;
          }

          // Get result from view function
          const resultHandle = await contract.getMatchResult(
            thisEthersSigner.address,
            otherUserAddress
          );

          setMatchResultHandle(resultHandle);
          setMessage("Match checked! Decrypting result...");

          // Auto decrypt (pass otherUserAddress)
          decryptMatchResult(resultHandle, otherUserAddress);
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          setMessage(`Check match failed: ${error.message}`);
        } finally {
          isCheckingRef.current = false;
          setIsChecking(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      loveKnot.address,
      loveKnot.abi,
      instance,
      chainId,
      sameChain,
      sameSigner,
    ]
  );

  const decryptMatchResult = useCallback(
    (handle: string, otherUserAddress?: string) => {
      if (isDecryptingRef.current) {
        return;
      }

      if (!loveKnot.address || !instance || !ethersSigner) {
        return;
      }

      if (handle === matchResult?.handle) {
        return;
      }

      if (handle === ethers.ZeroHash) {
        setMatchResult({ handle, clear: 0 });
        return;
      }

      const thisChainId = chainId;
      const thisLoveKnotAddress = loveKnot.address;
      const thisHandle = handle;
      const thisEthersSigner = ethersSigner;

      isDecryptingRef.current = true;
      setIsDecrypting(true);
      setMessage("Decrypting match result...");

      const run = async () => {
        const isStale = () =>
          thisLoveKnotAddress !== loveKnotRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const sig: FhevmDecryptionSignature | null =
            await FhevmDecryptionSignature.loadOrSign(
              instance,
              [loveKnot.address as `0x${string}`],
              ethersSigner,
              fhevmDecryptionSignatureStorage
            );

          if (!sig) {
            setMessage("Unable to build FHEVM decryption signature");
            return;
          }

          if (isStale()) {
            setMessage("Ignore FHEVM decryption");
            return;
          }

          setMessage("Calling FHEVM userDecrypt...");

          const res = await instance.userDecrypt(
            [{ handle: thisHandle, contractAddress: thisLoveKnotAddress }],
            sig.privateKey,
            sig.publicKey,
            sig.signature,
            sig.contractAddresses,
            sig.userAddress,
            sig.startTimestamp,
            sig.durationDays
          );

          setMessage("FHEVM userDecrypt completed!");

          if (isStale()) {
            setMessage("Ignore FHEVM decryption");
            return;
          }

          const clearValue = res[thisHandle as keyof typeof res];
          const clearValueNumber = typeof clearValue === 'bigint' ? Number(clearValue) : clearValue === true ? 1 : clearValue === false ? 0 : 0;
          setMatchResult({ handle: thisHandle, clear: clearValueNumber });

          if (clearValueNumber === 1) {
            setMessage("Match found! 🎉");
            
            // Store match in localStorage for My Matches page
            if (otherUserAddress) {
              try {
                const matchRecord: {
                  userA: string;
                  userB: string;
                  timestamp: number;
                  blockNumber: number;
                } = {
                  userA: thisEthersSigner.address.toLowerCase(),
                  userB: otherUserAddress.toLowerCase(),
                  timestamp: Math.floor(Date.now() / 1000),
                  blockNumber: 0, // We don't have block number here, but it's optional
                };
                
                const storageKey = `loveknot_matches_${thisEthersSigner.address.toLowerCase()}`;
                const existingMatches = localStorage.getItem(storageKey);
                const matches = existingMatches ? JSON.parse(existingMatches) : [];
                
                // Check if this match already exists
                const matchExists = matches.some(
                  (m: typeof matchRecord) =>
                    (m.userA === matchRecord.userA && m.userB === matchRecord.userB) ||
                    (m.userA === matchRecord.userB && m.userB === matchRecord.userA)
                );
                
                if (!matchExists) {
                  matches.push(matchRecord);
                  localStorage.setItem(storageKey, JSON.stringify(matches));
                }
              } catch (e) {
                console.error("Failed to store match:", e);
              }
            }
          } else {
            setMessage("No match found.");
          }
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          setMessage(`Decryption failed: ${error.message}`);
        } finally {
          isDecryptingRef.current = false;
          setIsDecrypting(false);
        }
      };

      run();
    },
    [
      fhevmDecryptionSignatureStorage,
      ethersSigner,
      loveKnot.address,
      instance,
      chainId,
      matchResult,
      sameChain,
      sameSigner,
    ]
  );

  const refreshRemainingAttempts = useCallback(() => {
    if (!loveKnot.address || !ethersReadonlyProvider) {
      return;
    }

    const contract = new ethers.Contract(
      loveKnot.address,
      loveKnot.abi,
      ethersReadonlyProvider
    );

    if (ethersSigner) {
      contract
        .getRemainingAttempts(ethersSigner.address)
        .then((attempts: bigint) => {
          setRemainingAttempts(Number(attempts));
        })
        .catch(() => {
          // Ignore errors
        });

      contract
        .getNextSubmissionTime(ethersSigner.address)
        .then((time: bigint) => {
          setNextSubmissionTime(Number(time));
        })
        .catch(() => {
          // Ignore errors
        });
    }
  }, [loveKnot.address, loveKnot.abi, ethersReadonlyProvider, ethersSigner]);

  const sendMessage = useCallback(
    (to: string, messageText: string) => {
      if (isSendingMessageRef.current || isSubmittingRef.current || isCheckingRef.current) {
        return;
      }

      if (!loveKnot.address || !instance || !ethersSigner) {
        setMessage("Cannot send message: missing contract, instance, or signer");
        return;
      }

      if (!ethers.isAddress(to)) {
        setMessage("Invalid recipient address format");
        return;
      }

      if (!messageText || messageText.trim().length === 0) {
        setMessage("Message cannot be empty");
        return;
      }

      const thisChainId = chainId;
      const thisLoveKnotAddress = loveKnot.address;
      const thisEthersSigner = ethersSigner;

      isSendingMessageRef.current = true;
      setIsSendingMessage(true);
      setMessage("Encoding message...");

      const run = async () => {
        const isStale = () =>
          thisLoveKnotAddress !== loveKnotRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          // Convert message to uint32 array
          const uint32Array = stringToUint32Array(messageText);
          
          if (uint32Array.length > 100) {
            setMessage("Message too long (max 400 characters)");
            return;
          }

          setMessage("Encrypting message...");

          // Encrypt all values together (they share one inputProof)
          const input = instance.createEncryptedInput(
            thisLoveKnotAddress,
            thisEthersSigner.address
          );
          
          for (const value of uint32Array) {
            input.add32(value);
          }

          const enc = await input.encrypt();

          if (isStale()) {
            setMessage("Ignore sendMessage");
            return;
          }

          setMessage("Sending message to contract...");

          const contract = new ethers.Contract(
            thisLoveKnotAddress,
            loveKnot.abi,
            thisEthersSigner
          );

          const tx: ethers.TransactionResponse = await contract.sendMessage(
            to,
            enc.handles,
            enc.inputProof
          );

          setMessage(`Waiting for tx: ${tx.hash}...`);

          const receipt = await tx.wait();

          setMessage(`Message sent! status=${receipt?.status}`);
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          setMessage(`Send message failed: ${error.message}`);
        } finally {
          isSendingMessageRef.current = false;
          setIsSendingMessage(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      loveKnot.address,
      loveKnot.abi,
      instance,
      chainId,
      sameChain,
      sameSigner,
    ]
  );

  const getMessages = useCallback(
    async (from: string, to: string): Promise<Array<{ message: string; from: string; to: string }> | null> => {
      if (isLoadingMessagesRef.current) {
        return null;
      }

      if (!loveKnot.address || !instance || !ethersReadonlyProvider) {
        return null;
      }

      if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
        return null;
      }

      const thisChainId = chainId;
      const thisLoveKnotAddress = loveKnot.address;
      const thisEthersSigner = ethersSigner;

      isLoadingMessagesRef.current = true;
      setIsLoadingMessages(true);

      const run = async () => {
        const isStale = () =>
          thisLoveKnotAddress !== loveKnotRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const contract = new ethers.Contract(
            thisLoveKnotAddress,
            loveKnot.abi,
            ethersReadonlyProvider
          );

          // Get message handles from both directions
          const messageHandlesFrom: string[] = await contract.getMessages(from, to);
          const messageHandlesTo: string[] = await contract.getMessages(to, from);

          if (isStale()) {
            return null;
          }

          // Combine all handles
          const allHandles: Array<{ handle: string; from: string; to: string }> = [];
          
          // Add messages from 'from' to 'to'
          messageHandlesFrom.forEach(handle => {
            allHandles.push({ handle, from, to });
          });
          
          // Add messages from 'to' to 'from'
          messageHandlesTo.forEach(handle => {
            allHandles.push({ handle, from: to, to: from });
          });

          if (allHandles.length === 0) {
            return null;
          }

          // Decrypt all message chunks
          if (!instance || !thisEthersSigner) {
            return null;
          }

          const sig: FhevmDecryptionSignature | null =
            await FhevmDecryptionSignature.loadOrSign(
              instance,
              [thisLoveKnotAddress as `0x${string}`],
              thisEthersSigner,
              fhevmDecryptionSignatureStorage
            );

          if (!sig) {
            return null;
          }

          if (isStale()) {
            return null;
          }

          // Prepare handles for decryption
          const decryptHandles = allHandles.map(({ handle }) => ({
            handle,
            contractAddress: thisLoveKnotAddress,
          }));

          const res = await instance.userDecrypt(
            decryptHandles,
            sig.privateKey,
            sig.publicKey,
            sig.signature,
            sig.contractAddresses,
            sig.userAddress,
            sig.startTimestamp,
            sig.durationDays
          );

          if (isStale()) {
            return null;
          }

          // Process messages from each direction separately
          const allMessages: Array<{ message: string; from: string; to: string }> = [];

          // Process messages from 'from' to 'to'
          if (messageHandlesFrom.length > 0) {
            const uint32ArrayFrom: number[] = [];
            for (const handle of messageHandlesFrom) {
              const clearValue = res[handle as keyof typeof res];
              if (clearValue !== undefined) {
                const value = typeof clearValue === 'bigint' ? Number(clearValue) : clearValue === true ? 1 : clearValue === false ? 0 : Number(clearValue);
                uint32ArrayFrom.push(value);
              }
            }
            const messagesFrom = uint32ArrayToMessages(uint32ArrayFrom);
            messagesFrom.forEach(msg => {
              allMessages.push({ message: msg, from, to });
            });
          }

          // Process messages from 'to' to 'from'
          if (messageHandlesTo.length > 0) {
            const uint32ArrayTo: number[] = [];
            for (const handle of messageHandlesTo) {
              const clearValue = res[handle as keyof typeof res];
              if (clearValue !== undefined) {
                const value = typeof clearValue === 'bigint' ? Number(clearValue) : clearValue === true ? 1 : clearValue === false ? 0 : Number(clearValue);
                uint32ArrayTo.push(value);
              }
            }
            const messagesTo = uint32ArrayToMessages(uint32ArrayTo);
            messagesTo.forEach(msg => {
              allMessages.push({ message: msg, from: to, to: from });
            });
          }

          return allMessages.length > 0 ? allMessages : null;
        } catch (e) {
          console.error("Failed to get messages:", e);
          return null;
        } finally {
          isLoadingMessagesRef.current = false;
          setIsLoadingMessages(false);
        }
      };

      return run();
    },
    [
      loveKnot.address,
      loveKnot.abi,
      instance,
      ethersReadonlyProvider,
      ethersSigner,
      chainId,
      fhevmDecryptionSignatureStorage,
      sameChain,
      sameSigner,
    ]
  );

  useEffect(() => {
    refreshRemainingAttempts();
  }, [refreshRemainingAttempts]);

  return {
    contractAddress: loveKnot.address,
    canSubmitCrush,
    canCheckMatch,
    canDecrypt,
    submitCrush,
    checkMatch,
    decryptMatchResult,
    sendMessage,
    getMessages,
    matchResult,
    isSubmitting,
    isChecking,
    isDecrypting,
    isSendingMessage,
    isLoadingMessages,
    message,
    remainingAttempts,
    nextSubmissionTime,
    isDeployed,
  };
};

