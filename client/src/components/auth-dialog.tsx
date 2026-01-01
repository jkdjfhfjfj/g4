import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Phone, Key, Lock, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  step: "phone" | "code" | "password" | "done";
  error: string | null;
  onSubmitPhone: (phone: string) => void;
  onSubmitCode: (code: string) => void;
  onSubmitPassword: (password: string) => void;
}

export function AuthDialog({
  open,
  onOpenChange,
  step,
  error: backendError,
  onSubmitPhone,
  onSubmitCode,
  onSubmitPassword,
}: AuthDialogProps & { onOpenChange?: (open: boolean) => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const error = backendError || localError;

  useEffect(() => {
    // Reset loading state when step changes, so the "Please wait" doesn't stick
    setIsLoading(false);
    setLocalError("");
  }, [step]);

  useEffect(() => {
    if (open) {
      setPhone("");
      setCode("");
      setPassword("");
      setLocalError("");
      setIsLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (backendError) {
      setIsLoading(false);
      // Don't clear localError here, let the UI show backendError which is preferred via:
      // const error = backendError || localError;
    }
  }, [backendError]);

  useEffect(() => {
    // Only reset local error if step changes or dialog opens
    // Don't reset on every render or small state change
  }, [step, open]);

  const handleSubmit = () => {
    // Keep backend error visible until new attempt starts
    setLocalError("");
    
    switch (step) {
      case "phone":
        if (!phone || phone.length < 8) {
          setLocalError("Please enter a valid phone number with country code");
          return;
        }
        setIsLoading(true);
        onSubmitPhone(phone);
        break;
      case "code":
        if (!code || code.length < 5) {
          setLocalError("Please enter the 5-digit code from Telegram");
          return;
        }
        setIsLoading(true);
        onSubmitCode(code);
        break;
      case "password":
        setIsLoading(true);
        onSubmitPassword(password);
        break;
    }
  };

  const getStepNumber = () => {
    switch (step) {
      case "phone": return 1;
      case "code": return 2;
      case "password": return 3;
      case "done": return 3;
    }
  };

  const getStepContent = () => {
    switch (step) {
      case "phone":
        return {
          icon: <Phone className="h-5 w-5 text-primary" />,
          title: "Connect Your Telegram",
          description: "Enter your phone number with country code (e.g., +1 for USA, +44 for UK). You'll receive a verification code in your Telegram app.",
          label: "Phone Number",
          placeholder: "+1234567890",
          value: phone,
          onChange: setPhone,
          type: "tel",
          hint: "Include your country code",
        };
      case "code":
        return {
          icon: <Key className="h-5 w-5 text-primary" />,
          title: "Verify Your Identity",
          description: `A 5-digit code was sent to your Telegram app on ${phone}. Check your Telegram messages and enter the code below.`,
          label: "Verification Code",
          placeholder: "12345",
          value: code,
          onChange: setCode,
          type: "text",
          hint: "Check your Telegram app for the code",
        };
      case "password":
        return {
          icon: <Lock className="h-5 w-5 text-primary" />,
          title: "Two-Factor Authentication",
          description: "If you have 2FA enabled on your Telegram account, enter your cloud password. If you don't have 2FA, click 'Skip' to continue.",
          label: "2FA Password",
          placeholder: "Your cloud password",
          value: password,
          onChange: setPassword,
          type: "password",
          hint: "Only required if you have 2FA enabled",
        };
      case "done":
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-success" />,
          title: "Connected!",
          description: "Your Telegram account is now connected.",
          label: "",
          placeholder: "",
          value: "",
          onChange: () => {},
          type: "text",
          hint: "",
        };
    }
  };

  const content = getStepContent()!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              Step {getStepNumber()} of 3
            </Badge>
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 w-8 rounded-full transition-colors ${
                    s <= getStepNumber() ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
          <DialogTitle className="flex items-center gap-2">
            {content.icon}
            {content.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {content.description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="auth-input">
              {content.label}
            </Label>
            <Input
              id="auth-input"
              type={content.type}
              value={content.value}
              onChange={(e) => {
                content.onChange(e.target.value);
                setLocalError("");
              }}
              placeholder={content.placeholder}
              className="font-mono"
              data-testid={`input-auth-${step}`}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSubmit()}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">{content.hint}</p>
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[11px] p-2.5 rounded-md flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step === "password" && (
            <Button
              variant="outline"
              onClick={() => {
                setIsLoading(true);
                onSubmitPassword("");
              }}
              disabled={isLoading}
              data-testid="button-skip-2fa"
            >
              Skip (No 2FA)
            </Button>
          )}
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            data-testid={`button-submit-${step}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Please wait...
              </>
            ) : (
              <>
                Continue
                <CheckCircle2 className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
