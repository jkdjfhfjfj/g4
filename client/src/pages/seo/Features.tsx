import { Helmet } from "react-helmet";
import { Zap, BarChart3, Shield, TrendingUp, Globe, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Trading Automation Features - TGTOMT Telegram to MT4/MT5</title>
        <meta name="description" content="Explore TGTOMT's powerful features: AI-powered signal detection, instant MT4/MT5 execution, risk management, and multi-channel Telegram monitoring." />
        <link rel="canonical" href="https://tgtomt.ddns.net/features" />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Professional Trading Features</h1>
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardContent className="pt-6">
              <Zap className="h-8 w-8 text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-2">Instant Signal Execution</h2>
              <p className="text-muted-foreground">Automate Telegram signals to MT4 and MT5 with zero latency. Our cloud infrastructure ensures you never miss a trade entry.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <BarChart3 className="h-8 w-8 text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-2">AI-Powered Validation</h2>
              <p className="text-muted-foreground">Every message is analyzed by advanced LLMs to identify high-probability signals while filtering out market noise.</p>
            </CardContent>
          </Card>
        </div>
        <div className="mt-12 text-center">
          <Link href="/">
            <Button size="lg">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
