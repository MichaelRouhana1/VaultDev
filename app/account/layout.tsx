import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-account",
});

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${montserrat.variable} ${montserrat.className} min-h-full bg-background text-foreground`}
    >
      {children}
    </div>
  );
}
