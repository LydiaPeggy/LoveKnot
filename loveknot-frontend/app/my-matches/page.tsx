"use client";

import { useEffect, useState } from "react";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useLoveKnot } from "@/hooks/useLoveKnot";
import Link from "next/link";

type MatchRecord = {
  userA: string;
  userB: string;
  timestamp: number;
  blockNumber: number;
};

export default function MyMatchesPage() {
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

  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<{ [key: string]: Array<{ message: string; from: string; to: string }> }>({});
  const [loadingMessages, setLoadingMessages] = useState<{ [key: string]: boolean }>({});
  const [lastMessageSent, setLastMessageSent] = useState<string>("");

  useEffect(() => {
    if (!isConnected || !accounts || accounts.length === 0) {
      setMatches([]);
      return;
    }

    const loadMatches = () => {
      setIsLoading(true);
      setError(null);

      try {
        const currentUser = accounts[0].toLowerCase();
        const storageKey = `loveknot_matches_${currentUser}`;
        const storedMatches = localStorage.getItem(storageKey);
        
        if (storedMatches) {
          const parsedMatches: MatchRecord[] = JSON.parse(storedMatches);
          const userMatches = parsedMatches.filter(
            (m) => m.userA.toLowerCase() === currentUser || m.userB.toLowerCase() === currentUser
          );
          userMatches.sort((a, b) => b.timestamp - a.timestamp);
          setMatches(userMatches);
        } else {
          setMatches([]);
        }
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        setError(`Failed to load matches: ${error.message}`);
        console.error("Error loading matches:", e);
        setMatches([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMatches();
  }, [isConnected, accounts]);

  // Auto-refresh messages when loveKnot.message indicates success
  useEffect(() => {
    if (loveKnot.message && loveKnot.message.includes("Message sent!") && selectedMatch && accounts && accounts.length > 0) {
      const otherUser = selectedMatch.userA.toLowerCase() === accounts[0].toLowerCase() 
        ? selectedMatch.userB 
        : selectedMatch.userA;
      const matchKey = `${selectedMatch.userA}-${selectedMatch.userB}`;
      
      // Only reload if not already loading
      if (loadingMessages[matchKey]) return;
      
      // Reload messages after a delay
      const timer = setTimeout(() => {
        const loadMessages = async () => {
          if (!loveKnot.getMessages) return;
          setLoadingMessages(prev => ({ ...prev, [matchKey]: true }));
          try {
            const messageList = await loveKnot.getMessages(accounts[0], otherUser);
            if (messageList && messageList.length > 0) {
              setMessages(prev => ({ ...prev, [matchKey]: messageList }));
            } else {
              setMessages(prev => ({ ...prev, [matchKey]: [] }));
            }
          } catch (e) {
            console.error("Failed to reload messages:", e);
          } finally {
            setLoadingMessages(prev => ({ ...prev, [matchKey]: false }));
          }
        };
        loadMessages();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [loveKnot.message, selectedMatch, accounts, loveKnot.getMessages]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-3xl font-bold">Connect Your Wallet</h2>
          <p className="text-lg text-muted-foreground max-w-md">
            Please connect your wallet to view your matches
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
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-3xl font-bold text-destructive">Contract Not Deployed</h2>
          <p className="text-muted-foreground">LoveKnot contract is not deployed on this network</p>
          <p className="text-sm text-muted-foreground">Chain ID: {chainId}</p>
        </div>
      </div>
    );
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          My Matches
        </h1>
        <p className="text-lg text-muted-foreground">
          View your matches and send encrypted messages
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-6 rounded-xl bg-destructive/10 border-2 border-destructive text-destructive">
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {!isLoading && !error && matches.length === 0 && (
        <div className="text-center py-16 space-y-6">
          <div className="text-8xl mb-4">💔</div>
          <h2 className="text-3xl font-bold">No Matches Yet</h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Start matching to see your results here! Go to the Match page to submit your crush target.
          </p>
          <Link
            href="/match"
            className="inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold text-lg hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Go to Match Page
          </Link>
        </div>
      )}

      {!isLoading && !error && matches.length > 0 && accounts && accounts.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Matches List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold mb-4">Your Matches</h2>
            {matches.map((match) => {
              const otherUser = match.userA.toLowerCase() === accounts[0].toLowerCase() 
                ? match.userB 
                : match.userA;
              const matchKey = `${match.userA}-${match.userB}`;
              const isSelected = selectedMatch && 
                ((selectedMatch.userA === match.userA && selectedMatch.userB === match.userB) ||
                 (selectedMatch.userA === match.userB && selectedMatch.userB === match.userA));
              
              return (
                <button
                  key={matchKey}
                  onClick={() => {
                    setSelectedMatch(isSelected ? null : match);
                    if (!isSelected) {
                      const loadMessages = async () => {
                        if (loadingMessages[matchKey] || !loveKnot.getMessages) return;
                        setLoadingMessages(prev => ({ ...prev, [matchKey]: true }));
                        try {
                          const messageList = await loveKnot.getMessages(accounts[0], otherUser);
                          if (messageList && messageList.length > 0) {
                            setMessages(prev => ({ ...prev, [matchKey]: messageList }));
                          } else {
                            // Clear messages if no messages found
                            setMessages(prev => ({ ...prev, [matchKey]: [] }));
                          }
                        } catch (e) {
                          console.error("Failed to load messages:", e);
                        } finally {
                          setLoadingMessages(prev => ({ ...prev, [matchKey]: false }));
                        }
                      };
                      loadMessages();
                    }
                  }}
                  className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
                    isSelected 
                      ? "border-primary bg-primary/10 shadow-lg" 
                      : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {otherUser.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{formatAddress(otherUser)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(match.timestamp * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {selectedMatch ? (
              (() => {
                const otherUser = selectedMatch.userA.toLowerCase() === accounts[0].toLowerCase() 
                  ? selectedMatch.userB 
                  : selectedMatch.userA;
                const matchKey = `${selectedMatch.userA}-${selectedMatch.userB}`;
                const isMessageLoading = loadingMessages[matchKey];

                const handleSendMessage = async () => {
                  if (!messageText.trim() || !loveKnot.sendMessage) return;
                  
                  const messageToSend = messageText;
                  setMessageText("");
                  
                  try {
                    await loveKnot.sendMessage(otherUser, messageToSend);
                    setLastMessageSent(messageToSend);
                    
                    // Wait for transaction confirmation and then reload messages
                    // Poll for message update with retries
                    const loadMessagesWithRetry = async (retries = 8, delay = 1500) => {
                      if (!loveKnot.getMessages) return;
                      
                      for (let i = 0; i < retries; i++) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                        
                        setLoadingMessages(prev => ({ ...prev, [matchKey]: true }));
                        try {
                          const messageList = await loveKnot.getMessages(accounts[0], otherUser);
                          if (messageList && messageList.length > 0) {
                            // Check if the new message is in the list
                            const hasNewMessage = messageList.some(msg => msg.message.includes(messageToSend.trim()));
                            if (hasNewMessage || i === retries - 1) {
                              // Found the new message or reached max retries, update UI
                              setMessages(prev => ({ ...prev, [matchKey]: messageList }));
                              setLoadingMessages(prev => ({ ...prev, [matchKey]: false }));
                              return; // Success, exit retry loop
                            }
                          }
                        } catch (e) {
                          console.error(`Failed to load messages (attempt ${i + 1}/${retries}):`, e);
                        } finally {
                          setLoadingMessages(prev => ({ ...prev, [matchKey]: false }));
                        }
                      }
                    };
                    
                    // Start loading messages after a short delay
                    loadMessagesWithRetry();
                  } catch (e) {
                    console.error("Failed to send message:", e);
                    // Restore message text on error
                    setMessageText(messageToSend);
                  }
                };

                return (
                  <div className="h-[600px] flex flex-col bg-card border-2 border-border rounded-2xl shadow-xl overflow-hidden">
                    {/* Chat Header */}
                    <div className="p-6 border-b border-border bg-gradient-to-r from-pink-500/10 to-purple-500/10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {otherUser.slice(2, 4).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{formatAddress(otherUser)}</p>
                          <p className="text-xs text-muted-foreground">Matched {new Date(selectedMatch.timestamp * 1000).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/30">
                      {isMessageLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="ml-3 text-sm text-muted-foreground">Loading messages...</span>
                        </div>
                      ) : messages[matchKey] && messages[matchKey].length > 0 ? (
                        <div className="space-y-3">
                          {messages[matchKey].map((msgItem, index) => {
                            const isFromMe = msgItem.from.toLowerCase() === accounts[0].toLowerCase();
                            return (
                              <div key={index} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                <div className={`max-w-[70%] p-4 rounded-2xl shadow-lg ${
                                  isFromMe 
                                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' 
                                    : 'bg-card border-2 border-border text-foreground'
                                }`}>
                                  <p className="text-sm whitespace-pre-wrap break-words">{msgItem.message}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12 space-y-4">
                          <div className="text-6xl mb-4">💬</div>
                          <p className="text-muted-foreground">No messages yet. Send the first one!</p>
                        </div>
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="p-6 border-t border-border bg-background">
                      {loveKnot.message && (
                        <div className="mb-3 p-3 rounded-lg bg-muted/50 border border-border">
                          <p className="text-xs text-muted-foreground">{loveKnot.message}</p>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Type your encrypted message here..."
                          className="flex-1 px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                          rows={2}
                          maxLength={400}
                          disabled={loveKnot.isSendingMessage}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!messageText.trim() || loveKnot.isSendingMessage}
                          className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loveKnot.isSendingMessage ? (
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                          ) : (
                            "Send"
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-right">
                        {messageText.length}/400 characters
                      </p>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="h-[600px] flex items-center justify-center bg-card border-2 border-border rounded-2xl">
                <div className="text-center space-y-4">
                  <div className="text-6xl mb-4">💕</div>
                  <p className="text-lg text-muted-foreground">Select a match to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
