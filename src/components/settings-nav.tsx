"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const navItems = [
  {
    href: "/settings/profile",
    title: "Profile",
  },
  {
    href: "/settings/apps",
    title: "Connected Apps",
  },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="grid items-start gap-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({ variant: isActive ? "default" : "ghost", size: "sm" }),
              "justify-start",
              !isActive && "text-muted-foreground"
            )}
          >
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}
