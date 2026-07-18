import { Home, Dumbbell, Sparkles, Apple, TrendingUp } from "lucide-react";

export const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/workouts", label: "Train", icon: Dumbbell },
  { href: "/coach", label: "Coach", icon: Sparkles },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/progress", label: "Progress", icon: TrendingUp },
] as const;
