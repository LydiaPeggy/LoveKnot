import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] gap-16">
      {/* Hero Section */}
      <div className="text-center space-y-8 max-w-4xl animate-fade-in">
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient">
            LoveKnot
          </h1>
          <div className="text-4xl mb-4">💕</div>
          <p className="text-3xl md:text-4xl text-muted-foreground font-light">
            The Secret Crush Verifier
          </p>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Only mutual feelings trigger the notification. Discover if your crush feels the same way, all while keeping your feelings private until there&apos;s a match.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/match"
            className="px-10 py-5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold text-lg hover:from-pink-600 hover:to-purple-700 transition-all shadow-2xl hover:shadow-3xl transform hover:scale-105 duration-300"
          >
            Start Your Journey →
          </Link>
          <Link
            href="/my-matches"
            className="px-10 py-5 rounded-2xl border-2 border-primary text-primary font-semibold text-lg hover:bg-primary/10 transition-all transform hover:scale-105 duration-300"
          >
            View My Matches
          </Link>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-8 w-full max-w-5xl">
        <div className="group p-8 rounded-2xl bg-card border-2 border-border shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 hover:border-primary/50">
          <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">🔒</div>
          <h3 className="text-2xl font-bold mb-3">Privacy First</h3>
          <p className="text-muted-foreground leading-relaxed">
            Your crush target is encrypted using Fully Homomorphic Encryption (FHE). No one can see it until there&apos;s a mutual match.
          </p>
        </div>
        <div className="group p-8 rounded-2xl bg-card border-2 border-border shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 hover:border-primary/50">
          <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">💕</div>
          <h3 className="text-2xl font-bold mb-3">Mutual Match</h3>
          <p className="text-muted-foreground leading-relaxed">
            Only when both of you select each other will the match be revealed. No awkward rejections, no one-sided feelings.
          </p>
        </div>
        <div className="group p-8 rounded-2xl bg-card border-2 border-border shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 hover:border-primary/50">
          <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">💬</div>
          <h3 className="text-2xl font-bold mb-3">Encrypted Messages</h3>
          <p className="text-muted-foreground leading-relaxed">
            Once matched, send encrypted messages to your match. All communication is protected by FHE encryption.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="w-full max-w-4xl p-10 rounded-3xl bg-gradient-to-br from-card via-card to-muted/30 border-2 border-border shadow-2xl">
        <h2 className="text-4xl font-bold text-center mb-10 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
          How It Works
        </h2>
        <div className="space-y-6">
          <div className="flex items-start gap-6 p-6 rounded-xl bg-background/50 hover:bg-background/80 transition-all">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-lg">
              1
            </div>
            <div className="flex-1 pt-2">
              <h3 className="text-xl font-semibold mb-2">Submit Your Crush</h3>
              <p className="text-muted-foreground">
                Enter the wallet address of the person you&apos;re interested in. Your choice is encrypted and stored securely on-chain.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-6 p-6 rounded-xl bg-background/50 hover:bg-background/80 transition-all">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-lg">
              2
            </div>
            <div className="flex-1 pt-2">
              <h3 className="text-xl font-semibold mb-2">Automatic Check</h3>
              <p className="text-muted-foreground">
                We automatically check if the other person has also selected you. The verification happens using FHE computation, keeping everything private.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-6 p-6 rounded-xl bg-background/50 hover:bg-background/80 transition-all">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-lg">
              3
            </div>
            <div className="flex-1 pt-2">
              <h3 className="text-xl font-semibold mb-2">Match Revealed</h3>
              <p className="text-muted-foreground">
                If there&apos;s a mutual match, you&apos;ll both be notified! You can then send encrypted messages to each other.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center space-y-6 max-w-2xl">
        <h2 className="text-3xl font-bold">Ready to Find Your Match?</h2>
        <p className="text-lg text-muted-foreground">
          Join thousands of users discovering mutual connections in complete privacy.
        </p>
        <Link
          href="/match"
          className="inline-block px-12 py-6 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xl hover:from-pink-600 hover:to-purple-700 transition-all shadow-2xl hover:shadow-3xl transform hover:scale-105 duration-300"
        >
          Get Started Now
        </Link>
      </div>
    </div>
  );
}
