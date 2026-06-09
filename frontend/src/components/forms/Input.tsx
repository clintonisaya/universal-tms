"use client";

import { Input as AntInput } from "antd";
import type { InputRef } from "antd";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps {
  /** Additional Tailwind classes */
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

/**
 * Styled Input wrapper around Ant Design Input.
 * Uses Tailwind for consistent styling across the app.
 */
export const Input = forwardRef<InputRef, InputProps>(
  ({ className, style, ...props }, ref) => (
    <AntInput
      ref={ref}
      className={cn("rounded-lg", className)}
      style={{
        fontSize: 14,
        ...style,
      }}
      {...props}
    />
  )
);

Input.displayName = "Input";

export interface TextAreaProps {
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export const TextArea = forwardRef<InputRef, TextAreaProps>(
  ({ className, style, ...props }, ref) => (
    <AntInput.TextArea
      ref={ref}
      className={cn("rounded-lg", className)}
      style={{
        fontSize: 14,
        ...style,
      }}
      {...props}
    />
  )
);

TextArea.displayName = "TextArea";

export interface PasswordInputProps {
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export const PasswordInput = forwardRef<InputRef, PasswordInputProps>(
  ({ className, style, ...props }, ref) => (
    <AntInput.Password
      ref={ref}
      className={cn("rounded-lg", className)}
      style={{
        fontSize: 14,
        ...style,
      }}
      {...props}
    />
  )
);

PasswordInput.displayName = "PasswordInput";
