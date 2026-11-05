import Script from "next/script";

type MetaPixelProps = {
  pixelIds: string[];
  /** Per-request CSP nonce from middleware (required for `script-src` in production). */
  nonce?: string;
};

/**
 * Meta (Facebook) Pixel base code: loads `fbevents.js` once and calls `fbq('init', …)`
 * for each shop pixel. Page views are sent with `trackSingle` from `MetaPixelRouteTracker`.
 */
export function MetaPixel({ pixelIds, nonce }: MetaPixelProps) {
  const inits = pixelIds.map((pixelId) => `fbq('init',${JSON.stringify(pixelId)});`).join("");
  const initScript = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');${inits}`;

  return (
    <Script id="meta-pixel-fbq" nonce={nonce} strategy="afterInteractive">
      {initScript}
    </Script>
  );
}

/** Noscript PageView for one shop. Render it only on that shop's pages. */
export function MetaShopNoscript({ pixelId }: { pixelId: string }) {
  return (
    <noscript>
      {/* Tracking pixel — must be a plain `<img>` per Meta; not a Next/Image asset. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height={1}
        width={1}
        src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`}
        alt=""
        style={{ display: "none" }}
      />
    </noscript>
  );
}
