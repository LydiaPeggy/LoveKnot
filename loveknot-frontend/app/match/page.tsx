"use client";

import { useState, useEffect } from "react";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useLoveKnot } from "@/hooks/useLoveKnot";
import Link from "next/link";

type Step = "submit" | "checking" | "matched" | "no-match" | "waiting";

export default function MatchPage() {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const loveKnot = useLoveKnot({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [targetAddress, setTargetAddress] = useState("");
  const [checkAddress, setCheckAddress] = useState("");
  const [currentStep, setCurrentStep] = useState<Step>("submit");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Auto-check match after submission (only once)
  useEffect(() => {
    if (hasSubmitted && targetAddress && !loveKnot.isSubmitting && !loveKnot.isChecking && !hasChecked) {
      // Wait a bit for the transaction to be confirmed
      const timer = setTimeout(() => {
        if (targetAddress && loveKnot.canCheckMatch && !hasChecked) {
          setCheckAddress(targetAddress);
          setCurrentStep("checking");
          setHasChecked(true);
          loveKnot.checkMatch(targetAddress);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasSubmitted, targetAddress, loveKnot.isSubmitting, loveKnot.isChecking, loveKnot.canCheckMatch, hasChecked]);

  // Check for errors (like "Other user not registered")
  useEffect(() => {
    if (loveKnot.message && currentStep === "checking") {
      if (loveKnot.message.includes("Other user not registered")) {
        setCurrentStep("waiting");
      } else if (loveKnot.message.includes("Check match failed")) {
        // Check if it's the "Other user not registered" error
        if (loveKnot.message.includes("Other user not registered")) {
          setCurrentStep("waiting");
        }
      }
    }
  }, [loveKnot.message, currentStep]);

  // Update step based on match result
  useEffect(() => {
    if (loveKnot.matchResult) {
      if (loveKnot.matchResult.clear === 1) {
        setCurrentStep("matched");
        // Store match in localStorage
        if (accounts && accounts.length > 0 && checkAddress) {
          try {
            const matchRecord = {
              userA: accounts[0].toLowerCase(),
              userB: checkAddress.toLowerCase(),
              timestamp: Math.floor(Date.now() / 1000),
              blockNumber: 0,
            };
            const storageKey = `loveknot_matches_${accounts[0].toLowerCase()}`;
            const existingMatches = localStorage.getItem(storageKey);
            const matches = existingMatches ? JSON.parse(existingMatches) : [];
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
        setCurrentStep("no-match");
      }
    }
  }, [loveKnot.matchResult, accounts, checkAddress]);

  const handleSubmit = () => {
    if (targetAddress && loveKnot.canSubmitCrush) {
      setHasSubmitted(true);
      setHasChecked(false); // Reset check flag when submitting new
      loveKnot.submitCrush(targetAddress);
    }
  };

  const handleReset = () => {
    setTargetAddress("");
    setCheckAddress("");
    setCurrentStep("submit");
    setHasSubmitted(false);
    setHasChecked(false);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-3xl font-bold">Connect Your Wallet</h2>
          <p className="text-lg text-muted-foreground max-w-md">
            Please connect your wallet to start finding your match
          </p>
        </div>
        <button
          onClick={connect}
          className="px-8 py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold text-lg hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (loveKnot.isDeployed === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-3xl font-bold text-destructive">Contract Not Deployed</h2>
          <p className="text-lg text-muted-foreground">
            LoveKnot contract is not deployed on this network
          </p>
          <p className="text-sm text-muted-foreground">Chain ID: {chainId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Find Your Match
        </h1>
        <p className="text-lg text-muted-foreground">
          Submit your crush target and we&apos;ll check for mutual matches
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${currentStep === "submit" ? "text-primary" : "text-green-500"}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            currentStep === "submit" ? "bg-primary text-primary-foreground" : "bg-green-500 text-white"
          }`}>
            {currentStep !== "submit" ? "✓" : "1"}
          </div>
          <span className="hidden sm:inline font-medium">Submit</span>
        </div>
        <div className={`h-1 w-16 ${currentStep !== "submit" ? "bg-green-500" : "bg-muted"}`} />
        <div className={`flex items-center gap-2 ${currentStep === "checking" ? "text-primary" : currentStep === "matched" || currentStep === "no-match" || currentStep === "waiting" ? "text-green-500" : "text-muted-foreground"}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            currentStep === "checking" ? "bg-primary text-primary-foreground animate-pulse" : 
            currentStep === "matched" || currentStep === "no-match" || currentStep === "waiting" ? "bg-green-500 text-white" : 
            "bg-muted text-muted-foreground"
          }`}>
            {currentStep === "matched" || currentStep === "no-match" || currentStep === "waiting" ? "✓" : "2"}
          </div>
          <span className="hidden sm:inline font-medium">Check</span>
        </div>
        <div className={`h-1 w-16 ${currentStep === "matched" || currentStep === "no-match" || currentStep === "waiting" ? "bg-green-500" : "bg-muted"}`} />
        <div className={`flex items-center gap-2 ${currentStep === "matched" || currentStep === "no-match" || currentStep === "waiting" ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            currentStep === "matched" ? "bg-primary text-primary-foreground" : 
            currentStep === "no-match" || currentStep === "waiting" ? "bg-green-500 text-white" :
            "bg-muted text-muted-foreground"
          }`}>
            {currentStep === "matched" ? "🎉" : currentStep === "waiting" ? "⏳" : currentStep === "no-match" ? "💔" : "3"}
          </div>
          <span className="hidden sm:inline font-medium">Result</span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-card border border-border rounded-2xl shadow-xl p-8 space-y-6">
        {currentStep === "submit" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Step 1: Submit Your Crush Target</h2>
              <p className="text-muted-foreground">
                Enter the wallet address of the person you&apos;re interested in
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Target Wallet Address
                </label>
                <input
                  type="text"
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                  disabled={loveKnot.isSubmitting}
                />
              </div>

              {loveKnot.remainingAttempts !== undefined && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Remaining attempts today:</span>
                  <span className="font-semibold text-primary">{loveKnot.remainingAttempts}</span>
                </div>
              )}

              {loveKnot.nextSubmissionTime && loveKnot.nextSubmissionTime * 1000 > Date.now() && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    ⏰ Next submission: {new Date(loveKnot.nextSubmissionTime * 1000).toLocaleString()}
                  </p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!loveKnot.canSubmitCrush || !targetAddress || loveKnot.isSubmitting}
                className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold text-lg hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loveKnot.isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  "Submit & Check Match"
                )}
              </button>
            </div>
          </div>
        )}

        {currentStep === "checking" && (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <div>
              <h2 className="text-2xl font-semibold mb-2">Checking for Match...</h2>
              <p className="text-muted-foreground">
                We&apos;re verifying if there&apos;s a mutual match using FHE encryption
              </p>
            </div>
            {loveKnot.message && (
              <p className="text-sm text-muted-foreground">{loveKnot.message}</p>
            )}
          </div>
        )}

        {currentStep === "matched" && (
          <div className="text-center space-y-6 py-8">
            <div className="text-8xl animate-bounce">🎉</div>
            <div>
              <h2 className="text-4xl font-bold text-green-500 mb-2">Match Found!</h2>
              <p className="text-lg text-muted-foreground mb-6">
                You and {checkAddress.slice(0, 6)}...{checkAddress.slice(-4)} have a mutual match!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/my-matches"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                View Matches & Messages
              </Link>
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-xl border-2 border-border hover:bg-muted transition-all"
              >
                Try Another
              </button>
            </div>
          </div>
        )}

        {currentStep === "no-match" && (
          <div className="text-center space-y-6 py-8">
            <div className="text-6xl">💔</div>
            <div>
              <h2 className="text-3xl font-bold mb-2">No Match Yet</h2>
              <p className="text-muted-foreground mb-6">
                The other person hasn&apos;t selected you yet, or you haven&apos;t selected them.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              Try Again
            </button>
          </div>
        )}

        {currentStep === "waiting" && (
          <div className="text-center space-y-6 py-8">
            <div className="text-6xl animate-pulse">⏳</div>
            <div>
              <h2 className="text-3xl font-bold mb-2">Waiting for the Other Person</h2>
              <p className="text-muted-foreground mb-4">
                You&apos;ve submitted your crush target, but the other person hasn&apos;t registered yet.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Once they submit their crush target, you can check for a match again.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  if (targetAddress && loveKnot.canCheckMatch) {
                    setCheckAddress(targetAddress);
                    setCurrentStep("checking");
                    setHasChecked(false); // Reset to allow checking again
                    loveKnot.checkMatch(targetAddress);
                  }
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                Check Again
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-xl border-2 border-border hover:bg-muted transition-all"
              >
                Try Another
              </button>
            </div>
          </div>
        )}

        {loveKnot.message && currentStep === "submit" && !loveKnot.message.includes("chainId=undefined") && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">{loveKnot.message}</p>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-2xl mb-2">🔒</div>
          <h3 className="font-semibold mb-1">Private</h3>
          <p className="text-xs text-muted-foreground">Your crush target is encrypted</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-2xl mb-2">⚡</div>
          <h3 className="font-semibold mb-1">Fast</h3>
          <p className="text-xs text-muted-foreground">Instant match verification</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-2xl mb-2">💬</div>
          <h3 className="font-semibold mb-1">Chat</h3>
          <p className="text-xs text-muted-foreground">Send encrypted messages</p>
        </div>
      </div>
    </div>
  );
}
