import { View, type ViewProps } from "react-native";

export interface SkeletonBlockProps extends ViewProps {
  className?: string;
}

/** Token-colored placeholder block for section-level loading states. */
export function SkeletonBlock({ className, ...rest }: SkeletonBlockProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`rounded-md bg-gray-200 ${className ?? ""}`}
      {...rest}
    />
  );
}

export interface SkeletonTextProps extends SkeletonBlockProps {
  size?: "caption" | "body" | "heading";
}

const sizeClass: Record<NonNullable<SkeletonTextProps["size"]>, string> = {
  caption: "h-[12px]",
  body: "h-[16px]",
  heading: "h-[24px]",
};

/** Text-shaped skeleton with the same tokenized surface as SkeletonBlock. */
export function SkeletonText({ size = "body", className, ...rest }: SkeletonTextProps) {
  return <SkeletonBlock className={`${sizeClass[size]} ${className ?? ""}`} {...rest} />;
}
