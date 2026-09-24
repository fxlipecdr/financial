import * as React from "react";
import { cn } from "@/lib/utils";

interface BackgroundSnippetProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

/**
 * Tailwind CSS Background Snippet
 * Author: @ibelick via 21st.dev (https://21st.dev/@ibelick/components/tailwind-css-background-snippet)
 */
export function TailwindBackground({
  className,
  children,
  ...props
}: BackgroundSnippetProps) {
  return (
    <div
      className={cn("relative min-h-screen w-full", className)}
      {...props}
    >
      {/* Background Pattern do 21st.dev (@ibelick) com suporte a light e dark */}
      <div className="pointer-events-none fixed inset-0 -z-10 h-full w-full">
        <div className="absolute inset-0 -z-10 h-full w-full items-center px-5 py-24 bg-white [background:radial-gradient(125%_125%_at_50%_10%,#fff_40%,#63e_100%)] dark:bg-black dark:[background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)]" />
      </div>
      {children}
    </div>
  );
}

// Export compatível com o snippet original do 21st.dev
export const Hero = () => {
  return (
    <div className={cn("w-full relative h-screen")}>
      <div className="absolute inset-0">
        <div className="absolute inset-0 -z-10 h-full w-full items-center px-5 py-24 [background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)]"></div>
      </div>
    </div>
  );
};
