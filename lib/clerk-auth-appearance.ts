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
 * Clerk SignIn / SignUp (+ ClerkProvider default) — white, flat, minimal.
 * Colors match `globals.css` `:root`: foreground/card #111 / #fff, border #e5e5e5, soft fill #F4F4F4, radius 0.625rem.
 * (Use static Tailwind arbitrary classes so the compiler retains them.)
 */
export const mosaikClerkAppearance: Appearance = {
  layout: {
    /** Hides the orange “Development mode” pill in dev (Clerk still recommends keeping it for safety). */
    unsafe_disableDevelopmentModeWarnings: true,
  },
  variables: {
    colorPrimary: "#111111",
    colorDanger: "#b91c1c",
    colorSuccess: "#15803d",
    colorWarning: "#a16207",
    colorText: "#111111",
    colorTextOnPrimaryBackground: "#ffffff",
    colorTextSecondary: "#737373",
    colorBackground: "#ffffff",
    colorInputText: "#111111",
    colorInputBackground: "#ffffff",
    colorNeutral: "#e5e5e5",
    borderRadius: "0.625rem",
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    fontWeight: {
      bold: "600",
      normal: "400",
    },
  },
  elements: {
    rootBox: "w-full flex justify-center",
    /** Fill the same column as the page (`max-w-md`); avoid `max-w-*` on `card` or it stays narrower than `cardBox`. */
    cardBox: "w-full",
    card:
      "w-full !max-w-none !rounded-[0.625rem] !border !border-solid !border-[#e5e5e5] !bg-white !p-6 !shadow-none sm:!p-8",
    headerTitle:
      "!text-[#111111] !font-semibold !tracking-normal !text-lg !leading-snug !mb-1 sm:!text-xl",
    headerSubtitle: "!text-[#737373] !text-sm !font-normal !leading-relaxed",
    socialButtonsBlockButton:
      "!rounded-[0.625rem] !border !border-solid !border-[#e5e5e5] !bg-white !text-[#111111] !shadow-none transition-colors hover:!bg-[#F4F4F4]",
    socialButtonsBlockButtonText: "!font-medium !text-[#111111]",
    socialButtonsProviderIcon: "!text-[#111111]",
    dividerLine: "!bg-[#e5e5e5]",
    dividerText: "!text-[#737373] !text-xs !font-normal !normal-case !tracking-normal",
    formFieldLabel: "!text-[#111111] !text-sm !font-medium !normal-case !tracking-normal",
    formFieldInput:
      "!rounded-[0.625rem] !border !border-solid !border-[#e5e5e5] !bg-white !text-[#111111] !shadow-none !outline-none transition-[box-shadow,border-color] focus:!border-[#111111] focus:!ring-1 focus:!ring-[#111111]/15 focus:!ring-offset-0",
    formFieldInputShowPasswordButton: "!text-[#737373] hover:!text-[#111111]",
    formButtonPrimary:
      "!rounded-[0.625rem] !border-0 !bg-[#111111] !text-white !font-medium !text-sm !shadow-none transition-opacity hover:!opacity-90",
    formButtonReset:
      "!rounded-[0.625rem] !border !border-solid !border-[#e5e5e5] !bg-white !text-[#111111] !shadow-none transition-colors hover:!bg-[#F4F4F4]",
    footerActionLink:
      "!font-medium !text-[#111111] !underline underline-offset-4 hover:!opacity-80",
    footerActionText: "!text-[#737373]",
    identityPreviewText: "!text-[#111111]",
    identityPreviewEditButton: "!text-[#111111]",
    formFieldErrorText: "!text-red-600 !text-sm",
    formFieldSuccessText: "!text-[#737373] !text-sm",
    alertText: "!text-[#111111]",
    otpCodeFieldInput:
      "!rounded-[0.625rem] !border !border-solid !border-[#e5e5e5] !bg-white !shadow-none !outline-none focus:!border-[#111111] focus:!ring-1 focus:!ring-[#111111]/15",
    navbarButton: "!rounded-[0.625rem]",
    badge:
      "!rounded-[0.625rem] !border !border-[#e5e5e5] !bg-[#F4F4F4] !text-[#111111] !text-xs",
    alternativeMethodsBlockButton:
      "!rounded-[0.625rem] !border !border-[#e5e5e5] !bg-white !text-[#111111] !shadow-none hover:!bg-[#F4F4F4]",
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
