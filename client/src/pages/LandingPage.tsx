import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { 
  Zap, 
  Shield, 
  TrendingUp, 
  MessageSquare, 
  BarChart3, 
  Globe,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* SEO Metadata should ideally be in a layout or via helmet, 
          but we'll ensure the content is rich for crawlers */}
      
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight">TGTOMT</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
          </div>
          <Link href="/dashboard">
            <Button size="sm" className="font-semibold">
              Open Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <Badge variant="outline" className="py-1 px-4 text-sm font-semibold border-primary/20 text-primary">
              Telegram to MetaTrader Automation
            </Badge>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
              Turn Telegram Signals into <span className="text-primary">MT4/MT5 Trades</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Automate your trading strategy with AI-powered signal detection. Monitor multiple channels, analyze technical sentiment, and execute on MetaTrader 4/5 instantly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/dashboard">
                <Button size="lg" className="h-12 px-8 text-lg font-bold shadow-lg shadow-primary/20">
                  Get Started for Free
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
                View Live Demo
              </Button>
            </div>
            <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-medium text-muted-foreground opacity-70">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> 24/7 Monitoring
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> 99.9% Uptime
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> MetaTrader Native
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> AI Validated
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl font-bold">Powerful Features for Serious Traders</h2>
              <p className="text-muted-foreground">Everything you need to automate your Telegram trading workflow.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<MessageSquare className="h-8 w-8" />}
                title="Multi-Channel Monitor"
                description="Connect unlimited Telegram channels and groups. Our engine filters the noise to find real trading opportunities."
              />
              <FeatureCard 
                icon={<BarChart3 className="h-8 w-8" />}
                title="AI Technical Analysis"
                description="Powered by Groq Llama 3.3. Every signal is analyzed for R/R ratio, support levels, and trend confirmation before execution."
              />
              <FeatureCard 
                icon={<Zap className="h-8 w-8" />}
                title="Instant Execution"
                description="Zero-latency trade execution on MT4/MT5 via MetaAPI cloud. Support for market and limit orders with automatic SL/TP."
              />
              <FeatureCard 
                icon={<Shield className="h-8 w-8" />}
                title="Risk Management"
                description="Set global lot sizes, max drawdown limits, and automatic trade expiration to protect your capital."
              />
              <FeatureCard 
                icon={<TrendingUp className="h-8 w-8" />}
                title="Live Performance"
                description="Track your equity, open positions, and history in a beautiful real-time dashboard with WebSocket updates."
              />
              <FeatureCard 
                icon={<Globe className="h-8 w-8" />}
                title="Cloud Based"
                description="Runs in the cloud 24/7. No need to keep your terminal open or use a dedicated VPS for the bot itself."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-bold">TGTOMT</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 TGTOMT. Trading forex involves high risk.
          </p>
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary">Terms</a>
            <a href="#" className="hover:text-primary">Privacy</a>
            <a href="#" className="hover:text-primary">Sitemap</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="hover-elevate transition-all border-none shadow-sm bg-background">
      <CardContent className="pt-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-2">
          {icon}
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

function Badge({ children, className, variant = "default" }: any) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  );
}
