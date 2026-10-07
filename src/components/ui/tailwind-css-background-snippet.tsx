import * as React from "react";
import { cn } from "@/lib/utils";

interface BackgroundSnippetProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

/**
 * Fundo da aplicação: superfície neutra com um brilho índigo muito sutil no topo
 * e uma grade pontilhada discreta que esmaece para baixo. Funciona em light e dark.
 * (Inspirado no snippet de background de @ibelick via 21st.dev.)
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
      <div className="pointer-events-none fixed inset-0 -z-10 h-full w-full bg-background">
        {/* Brilho suave no topo */}
        <div className="absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklch,var(--primary)_12%,transparent)_0%,transparent_100%)]" />
        {/* Grade pontilhada que esmaece */}
        <div className="absolute inset-0 opacity-[0.35] dark:opacity-[0.25] bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_420px)]" />
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
