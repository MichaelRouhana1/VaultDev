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
 * Clerk SignIn / SignUp (and global ClerkProvider default) — modern card, soft shadow,
 * rounded controls, comfortable spacing. Uses theme `primary` for focus rings where Tailwind resolves it.
 */
export const mosaikClerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#111111",
    colorDanger: "#b91c1c",
    colorSuccess: "#15803d",
    colorWarning: "#a16207",
    colorText: "#111111",
    colorTextOnPrimaryBackground: "#ffffff",
    colorTextSecondary: "#71717a",
    colorBackground: "#ffffff",
    colorInputText: "#111111",
    colorInputBackground: "#ffffff",
    colorNeutral: "#e4e4e7",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    fontWeight: {
      bold: "600",
      normal: "400",
    },
  },
  elements: {
    rootBox: "w-full flex justify-center",
    card:
      "w-full max-w-[26rem] !rounded-2xl !border !border-solid !border-zinc-200/80 !bg-white !p-8 !shadow-xl !shadow-zinc-900/5 sm:!p-10",
    headerTitle:
      "!text-[#111111] !font-semibold !tracking-tight !text-xl !leading-tight !mb-1.5 sm:!text-[1.35rem]",
    headerSubtitle: "!text-zinc-500 !text-sm !font-normal !leading-relaxed",
    socialButtonsBlockButton:
      "!rounded-lg !border !border-solid !border-zinc-200 !bg-white !text-[#111111] !shadow-sm transition-all duration-200 hover:!border-zinc-300 hover:!bg-zinc-50",
    socialButtonsBlockButtonText: "!font-medium !text-[#111111]",
    socialButtonsProviderIcon: "!text-[#111111]",
    dividerLine: "!bg-zinc-200/80",
    dividerText: "!text-zinc-400 !text-xs !font-medium !uppercase !tracking-wider",
    formFieldLabel:
      "!text-zinc-500 !text-xs !font-medium !uppercase !tracking-wider",
    formFieldInput:
      "!rounded-lg !border !border-solid !border-zinc-200 !bg-white !text-[#111111] !shadow-sm transition-shadow duration-200 !outline-none focus:!border-transparent focus:!ring-2 focus:!ring-primary/25 focus:!ring-offset-0",
    formFieldInputShowPasswordButton: "!text-zinc-600 hover:!text-[#111111]",
    formButtonPrimary:
      "!rounded-lg !border-0 !bg-[#111111] !text-white !font-semibold !text-sm !shadow-md !shadow-zinc-900/10 transition-all duration-200 hover:!opacity-90 hover:!-translate-y-0.5 active:!translate-y-0",
    formButtonReset:
      "!rounded-lg !border !border-solid !border-zinc-200 !bg-white !text-[#111111] !shadow-sm transition-all duration-200 hover:!bg-zinc-50",
    footerActionLink: "!font-medium !text-[#111111] !underline underline-offset-4 hover:!text-zinc-700",
    footerActionText: "!text-zinc-500",
    identityPreviewText: "!text-[#111111]",
    identityPreviewEditButton: "!text-[#111111]",
    formFieldErrorText: "!text-red-600 !text-sm",
    formFieldSuccessText: "!text-zinc-600 !text-sm",
    alertText: "!text-[#111111]",
    otpCodeFieldInput:
      "!rounded-lg !border !border-solid !border-zinc-200 !bg-white !shadow-sm !outline-none focus:!border-transparent focus:!ring-2 focus:!ring-primary/25 focus:!ring-offset-0",
    navbarButton: "!rounded-lg",
    badge:
      "!rounded-lg !border !border-zinc-200 !bg-zinc-50 !text-[#111111] !text-xs",
    alternativeMethodsBlockButton:
      "!rounded-lg !border !border-zinc-200 !bg-white !text-[#111111] !shadow-sm transition-all duration-200 hover:!bg-zinc-50",
    formResendCodeLink: "!text-[#111111] !font-medium !underline",
    spinnerIcon: "!text-[#111111]",
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
