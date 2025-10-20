import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";

type Plan = {
  name: string;
  price: string;
  priceId: string;
  features: string[];
};

const plans = [
  {
    name: "Free",
    price: "$0",
    priceId: "price_1SDi8v3gGYo8Ox0VUYTKOm6C", 
    features: ["Basic features", "Community support"],
  },
  {
    name: "Personal",
    price: "$20",
    priceId: "price_1SDiBb3gGYo8Ox0V6GDmCQED",
    features: ["Pro features", "Email support"],
  },
  {
    name: "Business",
    price: "$200",
    priceId: "price_1SDiCz3gGYo8Ox0VeQ9b9XuT",
    features: ["Priority support", "Advanced analytics"],
  },]

function PlanCard({ plan, isCurrent }: { plan: Plan; isCurrent: boolean }) {
  const [loading, setLoading] = useState(false);
  
  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.priceId }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("❌ API error response:", text);
        return;
      }

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url; // Stripeへリダイレクト！
      } else {
        toast.error("Checkout failed!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900 relative">
      {isCurrent && (
        <span className="absolute top-3 right-3 text-xs bg-gray-800 text-white px-2 py-1 rounded-full">
          Current Plan
        </span>
      )}

      <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
      <p className="text-2xl font-semibold mb-4">{plan.price} <span className="text-sm">/ month</span></p>
      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 mb-6">
        {plan.features.map((f: string, i: number) => (
          <li key={i} className="flex items-center">
            <Check className="w-4 h-4 text-green-500 mr-2" />
            {f}
          </li>
        ))}
      </ul>

      {!isCurrent && plan.priceId && (
        <Button 
          className="w-full" 
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? "Redirecting..." : `Upgrade to ${plan.name}`}
        </Button>
      )}
    </div>
  );
}

export function ManagePlanModal({
    currentPlan,
    trigger,
}: {
    currentPlan: string
    trigger?: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-w-4xl">
        <DialogTitle className="text-2xl font-bold mb-4 text-center">
          Choose Your Plan
        </DialogTitle>
        <DialogDescription className="text-sm text-gray-500 text-center mb-6">
          Select the plan that best fits your needs
        </DialogDescription>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              isCurrent={plan.name === currentPlan}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}