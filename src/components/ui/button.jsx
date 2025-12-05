import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "/src/components/ui/utils.js"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#1a1a1a] text-white border border-[#1a1a1a] hover:bg-[#333333] hover:border-[#333333]",
        destructive: "bg-[#1a1a1a] text-white border border-[#1a1a1a] hover:bg-[#333333]",
        outline: "border border-[#e5e5e5] bg-white hover:bg-[#fafafa] hover:border-[#999999] text-[#1a1a1a]",
        secondary: "bg-[#f5f5f5] text-[#1a1a1a] hover:bg-[#e5e5e5]",
        ghost: "hover:bg-[#f5f5f5] text-[#1a1a1a]",
        link: "text-[#1a1a1a] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
