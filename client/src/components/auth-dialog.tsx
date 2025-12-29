import { useState } from "react";
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
import { Phone, Key, Lock } from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  onSubmitPhone: (phone: string) => void;
  onSubmitCode: (code: string) => void;
  onSubmitPassword: (password: string) => void;
}

type AuthStep = "phone" | "code" | "password";

export function AuthDialog({
  open,
  onSubmitPhone,
  onSubmitCode,
  onSubmitPassword,
}: AuthDialogProps) {
  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    switch (step) {
      case "phone":
        onSubmitPhone(phone);
        setStep("code");
        break;
      case "code":
        onSubmitCode(code);
        setStep("password");
        break;
      case "password":
        onSubmitPassword(password);
        break;
    }
  };

  const getStepContent = () => {
    switch (step) {
      case "phone":
        return {
          icon: <Phone className="h-5 w-5" />,
          title: "Telegram Authentication",
          description: "Enter your phone number to connect to Telegram",
          label: "Phone Number",
          placeholder: "+1234567890",
          value: phone,
          onChange: setPhone,
          type: "tel",
        };
      case "code":
        return {
          icon: <Key className="h-5 w-5" />,
          title: "Enter Verification Code",
          description: "Check your Telegram app for the verification code",
          label: "Verification Code",
          placeholder: "12345",
          value: code,
          onChange: setCode,
          type: "text",
        };
      case "password":
        return {
          icon: <Lock className="h-5 w-5" />,
          title: "Two-Factor Authentication",
          description: "Enter your Telegram 2FA password (if enabled)",
          label: "Password",
          placeholder: "Your 2FA password",
          value: password,
          onChange: setPassword,
          type: "password",
        };
    }
  };

  const content = getStepContent();

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {content.icon}
            {content.title}
          </DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="auth-input" className="text-right">
              {content.label}
            </Label>
            <Input
              id="auth-input"
              type={content.type}
              value={content.value}
              onChange={(e) => content.onChange(e.target.value)}
              placeholder={content.placeholder}
              className="col-span-3"
              data-testid={`input-auth-${step}`}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
        </div>
        <DialogFooter>
          {step === "password" && (
            <Button
              variant="outline"
              onClick={() => onSubmitPassword("")}
              data-testid="button-skip-2fa"
            >
              Skip (No 2FA)
            </Button>
          )}
          <Button onClick={handleSubmit} data-testid={`button-submit-${step}`}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
