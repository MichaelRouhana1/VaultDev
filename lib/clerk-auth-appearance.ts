import type { Appearance } from "@clerk/types";

/**
 * `<UserButton />` profile menu — global appearance uses `borderRadius: 0` and muted tokens
 * that make popover actions nearly invisible; Navbar merges these per theme.
 */
export const mosaikClerkUserButtonPopoverElementsLight: NonNullable<Appearance["elements"]> = {
  userButtonPopoverCard:
    "!rounded-lg overflow-hidden shadow-lg border border-[#E4E4E7] !bg-white",
  userButtonPopoverMain: "!text-neutral-900",
  userPreviewMainIdentifier: "!text-neutral-900 !font-semibold",
  userPreviewSecondaryIdentifier: "!text-neutral-600",
  userButtonPopoverActionButton:
    "!text-neutral-900 [&_svg]:!text-neutral-900 hover:!bg-neutral-100 focus:!bg-neutral-100",
  userButtonPopoverActionButtonText: "!text-neutral-900 !font-medium",
  userButtonPopoverActionButtonIcon: "!text-neutral-900",
  userButtonPopoverFooter: "!bg-neutral-50 border-t border-neutral-200",
};

export const mosaikClerkUserButtonPopoverElementsDark: NonNullable<Appearance["elements"]> = {
  userButtonPopoverCard:
    "!rounded-xl overflow-hidden !border !border-white/20 !bg-[#1a1a1a] !shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_20px_50px_-12px_rgba(0,0,0,0.85),0_0_40px_-8px_rgba(0,0,0,0.5)]",
  userButtonPopoverMain: "!text-neutral-100",
  userPreviewMainIdentifier: "!text-neutral-100 !font-semibold",
  userPreviewSecondaryIdentifier: "!text-neutral-400",
  userButtonPopoverActionButton:
    "!text-neutral-100 [&_svg]:!text-neutral-100 hover:!bg-white/10 focus:!bg-white/10",
  userButtonPopoverActionButtonText: "!text-neutral-100 !font-medium",
  userButtonPopoverActionButtonIcon: "!text-neutral-100",
  userButtonPopoverFooter:
    "!bg-[#141414] !border-t !border-white/15",
};

/** Overrides ClerkProvider’s light variables inside the UserButton menu only. */
export const mosaikClerkUserButtonVariablesLight: NonNullable<Appearance["variables"]> = {
  colorBackground: "#ffffff",
  colorText: "#171717",
  colorTextSecondary: "#525252",
  colorNeutral: "#e5e5e5",
  borderRadius: "0.5rem",
};

export const mosaikClerkUserButtonVariablesDark: NonNullable<Appearance["variables"]> = {
  colorBackground: "#1a1a1a",
  colorText: "#fafafa",
  colorTextSecondary: "#a3a3a3",
  colorNeutral: "#525252",
  borderRadius: "0.75rem",
};

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

/**
 * Clerk UserProfile on `/account` when `html.dark` — aligned with `globals.css` `.dark` tokens.
 */
export const mosaikClerkAccountDarkAppearance: Appearance = {
  variables: {
    colorPrimary: "#ffffff",
    colorDanger: "#f87171",
    colorSuccess: "#86efac",
    colorWarning: "#fcd34d",
    colorText: "#ffffff",
    colorTextOnPrimaryBackground: "#111111",
    colorTextSecondary: "#a3a3a3",
    colorBackground: "#0a0a0a",
    colorInputText: "#ffffff",
    colorInputBackground: "#141414",
    colorNeutral: "#262626",
    borderRadius: "0px",
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    fontWeight: {
      bold: "600",
      normal: "400",
    },
  },
  elements: {
    rootBox: "w-full flex justify-center",
    card: "w-full max-w-[22rem] !rounded-none !shadow-none border border-solid border-[#262626] bg-[#141414]",
    headerTitle:
      "!text-[#ffffff] !font-semibold !tracking-tight !text-[1.25rem] !leading-tight !mb-1",
    headerSubtitle: "!text-[#a3a3a3] !text-sm !font-normal !leading-relaxed",
    socialButtonsBlockButton:
      "!rounded-none !shadow-none border !border-solid !border-[#ffffff] !bg-[#141414] !text-[#ffffff] hover:!bg-[#262626]",
    socialButtonsBlockButtonText: "!font-medium !text-[#ffffff]",
    socialButtonsProviderIcon: "!text-[#ffffff]",
    dividerLine: "!bg-[#262626]",
    dividerText: "!text-[#a3a3a3] !text-xs !uppercase !tracking-widest",
    formFieldLabel: "!text-[#a3a3a3] !text-[0.7rem] !uppercase !tracking-widest !font-medium",
    formFieldInput:
      "!rounded-none !shadow-none border !border-solid !border-[#262626] !bg-[#141414] !text-[#ffffff] focus:!border-[#ffffff] focus:!ring-1 focus:!ring-[#ffffff] focus:!ring-offset-0 !outline-none",
    formFieldInputShowPasswordButton: "!text-[#ffffff]",
    formButtonPrimary:
      "!rounded-none !shadow-none !bg-[#ffffff] !text-[#111111] hover:!opacity-90 !uppercase !tracking-[0.2em] !font-semibold !text-xs",
    formButtonReset:
      "!rounded-none !shadow-none border !border-solid !border-[#262626] !bg-[#141414] !text-[#ffffff]",
    footerActionLink: "!text-[#ffffff] !font-medium !underline underline-offset-4",
    footerActionText: "!text-[#a3a3a3]",
    identityPreviewText: "!text-[#ffffff]",
    identityPreviewEditButton: "!text-[#ffffff]",
    formFieldErrorText: "!text-[#fca5a5] !text-sm",
    formFieldSuccessText: "!text-[#a3a3a3] !text-sm",
    alertText: "!text-[#ffffff]",
    otpCodeFieldInput:
      "!rounded-none !shadow-none !border !border-[#262626] focus:!border-[#ffffff] focus:!ring-1 focus:!ring-[#ffffff]",
    navbarButton: "!rounded-none",
    badge: "!rounded-none border border-[#262626] !bg-[#141414] !text-[#ffffff]",
    alternativeMethodsBlockButton:
      "!rounded-none !shadow-none border !border-[#262626] !bg-[#141414] !text-[#ffffff]",
    formResendCodeLink: "!text-[#ffffff] !underline",
    spinnerIcon: "!text-[#ffffff]",
  },
};
