import { Helmet } from "react-helmet";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>How It Works - Automate Telegram Signals to MetaTrader</title>
        <meta name="description" content="Learn how to connect your Telegram channels to MetaTrader 4/5. 3 simple steps to automate your trading with TGTOMT." />
        <link rel="canonical" href="https://tgtomt.ddns.net/how-it-works" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-12 text-center">How TGTOMT Works</h1>
        <div className="space-y-12">
          <div className="flex gap-6">
            <div className="flex-none w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">1</div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Connect Telegram</h2>
              <p className="text-muted-foreground text-lg">Securely link your Telegram account and select the channels or groups you want to monitor for signals.</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex-none w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">2</div>
            <div>
              <h2 className="text-2xl font-bold mb-2">AI Signal Analysis</h2>
              <p className="text-muted-foreground text-lg">Our AI engine scans messages in real-time, extracting symbols, entry prices, SL, and TP levels with technical sentiment scores.</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex-none w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">3</div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Automated Execution</h2>
              <p className="text-muted-foreground text-lg">Verified signals are instantly executed on your MetaTrader account. You maintain full control with manual approval options.</p>
            </div>
          </div>
        </div>
        <div className="mt-16 text-center">
          <Link href="/dashboard">
            <Button size="lg" className="px-12 font-bold">Start Automating Now</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
