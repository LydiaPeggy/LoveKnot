"use client";

import Link from "next/link";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { isConnected, accounts, connect, chainId } = useMetaMaskEthersSigner();
  const pathname = usePathname();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = () => {
    if (chainId === 31337) return "Localhost";
    if (chainId === 11155111) return "Sepolia";
    return `Chain ${chainId}`;
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b-2 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container flex h-20 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-clip-text text-transparent group-hover:from-pink-600 group-hover:via-purple-600 group-hover:to-pink-600 transition-all">
              LoveKnot
            </span>
            <span className="text-2xl group-hover:scale-110 transition-transform">💕</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Home
            </Link>
            <Link
              href="/match"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/match")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Match
            </Link>
            <Link
              href="/my-matches"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/my-matches")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              My Matches
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {chainId && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">
                {getNetworkName()}
              </span>
            </div>
          )}
          {isConnected && accounts && accounts.length > 0 ? (
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-2 border-primary/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold text-foreground">
                {formatAddress(accounts[0])}
              </span>
            </div>
          ) : (
            <button
              onClick={connect}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
