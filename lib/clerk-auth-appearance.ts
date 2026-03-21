import type { Appearance } from "@clerk/types";

/**
 * Clerk SignIn / SignUp styling — “quiet confidence” editorial (strict B/W + zinc muted).
 * Aligns with `globals.css` tokens: foreground ≈ #000, background #FFF, borders #E4E4E7.
 */
export const mosaikClerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#000000",
    colorDanger: "#000000",
    colorSuccess: "#000000",
    colorWarning: "#000000",
    colorText: "#000000",
    colorTextOnPrimaryBackground: "#FFFFFF",
    colorTextSecondary: "#71717A",
    colorBackground: "#FFFFFF",
    colorInputText: "#000000",
    colorInputBackground: "#FFFFFF",
    colorNeutral: "#E4E4E7",
    borderRadius: "0px",
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    fontWeight: {
      bold: "600",
      normal: "400",
    },
  },
  elements: {
    rootBox: "w-full flex justify-center",
    card: "w-full max-w-[22rem] !rounded-none !shadow-none border border-solid border-[#E4E4E7] bg-[#FFFFFF]",
    headerTitle:
      "!text-[#000000] !font-semibold !tracking-tight !text-[1.25rem] !leading-tight !mb-1",
    headerSubtitle: "!text-[#71717A] !text-sm !font-normal !leading-relaxed",
    socialButtonsBlockButton:
      "!rounded-none !shadow-none border !border-solid !border-[#000000] !bg-[#FFFFFF] !text-[#000000] hover:!bg-[#FAFAFA]",
    socialButtonsBlockButtonText: "!font-medium !text-[#000000]",
    socialButtonsProviderIcon: "!text-[#000000]",
    dividerLine: "!bg-[#E4E4E7]",
    dividerText: "!text-[#71717A] !text-xs !uppercase !tracking-widest",
    formFieldLabel: "!text-[#71717A] !text-[0.7rem] !uppercase !tracking-widest !font-medium",
    formFieldInput:
      "!rounded-none !shadow-none border !border-solid !border-[#E4E4E7] !bg-[#FFFFFF] !text-[#000000] focus:!border-[#000000] focus:!ring-1 focus:!ring-[#000000] focus:!ring-offset-0 !outline-none",
    formFieldInputShowPasswordButton: "!text-[#000000]",
    formButtonPrimary:
      "!rounded-none !shadow-none !bg-[#000000] !text-[#FFFFFF] hover:!bg-[#000000] hover:!opacity-90 !uppercase !tracking-[0.2em] !font-semibold !text-xs",
    formButtonReset:
      "!rounded-none !shadow-none border !border-solid !border-[#E4E4E7] !bg-[#FFFFFF] !text-[#000000]",
    footerActionLink: "!text-[#000000] !font-medium !underline underline-offset-4",
    footerActionText: "!text-[#71717A]",
    identityPreviewText: "!text-[#000000]",
    identityPreviewEditButton: "!text-[#000000]",
    formFieldErrorText: "!text-[#000000] !text-sm",
    formFieldSuccessText: "!text-[#71717A] !text-sm",
    alertText: "!text-[#000000]",
    otpCodeFieldInput:
      "!rounded-none !shadow-none !border !border-[#E4E4E7] focus:!border-[#000000] focus:!ring-1 focus:!ring-[#000000]",
    navbarButton: "!rounded-none",
    badge: "!rounded-none border border-[#E4E4E7] !bg-[#FFFFFF] !text-[#000000]",
    alternativeMethodsBlockButton:
      "!rounded-none !shadow-none border !border-[#E4E4E7] !bg-[#FFFFFF] !text-[#000000]",
    formResendCodeLink: "!text-[#000000] !underline",
    spinnerIcon: "!text-[#000000]",
  },
};
