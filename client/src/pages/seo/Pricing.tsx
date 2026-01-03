import { Helmet } from "react-helmet";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Pricing Plans - TGTOMT Telegram to MetaTrader Bot</title>
        <meta name="description" content="Choose the perfect plan for your trading. TGTOMT pricing starts at just . Automate your Telegram signals to MT4/MT5 today." />
        <link rel="canonical" href="https://tgtomt.ddns.net/pricing" />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Simple, Scalable Pricing</h1>
          <p className="text-muted-foreground text-lg">Start automating for as little as  per month.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="flex flex-col border-none shadow-md bg-background">
            <CardContent className="pt-8 flex-1 flex flex-col items-center text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold uppercase tracking-wider text-muted-foreground">Starter</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold"></span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-left w-full">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 1 Telegram Channel</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Basic Execution</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Community Support</li>
              </ul>
              <Button className="w-full mt-auto" variant="outline">Choose Starter</Button>
            </CardContent>
          </Card>
          <Card className="flex flex-col border-2 border-primary shadow-xl bg-background relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold py-1 px-3 rounded-bl-lg uppercase">Most Popular</div>
            <CardContent className="pt-8 flex-1 flex flex-col items-center text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold uppercase tracking-wider text-primary">Pro</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold">9</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-left w-full">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 10 Telegram Channels</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> AI Signal Validation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Advanced Risk Management</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Priority Support</li>
              </ul>
              <Button className="w-full mt-auto">Go Pro</Button>
            </CardContent>
          </Card>
          <Card className="flex flex-col border-none shadow-md bg-background">
            <CardContent className="pt-8 flex-1 flex flex-col items-center text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold uppercase tracking-wider text-muted-foreground">Enterprise</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold">9</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-left w-full">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited Channels</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Custom AI Prompting</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> API Access</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Dedicated Account Manager</li>
              </ul>
              <Button className="w-full mt-auto" variant="outline">Contact Sales</Button>
            </CardContent>
          </Card>
        </div>
        <div className="mt-16 text-center">
          <Link href="/">
            <Button variant="ghost">← Back to Overview</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
