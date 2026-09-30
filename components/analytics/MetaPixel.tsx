import Script from "next/script";

type MetaPixelProps = {
  pixelId: string;
  /** Per-request CSP nonce from middleware (required for `script-src` in production). */
  nonce?: string;
};

/**
 * Meta (Facebook) Pixel base code: loads `fbevents.js` and calls `fbq('init', …)`.
 * Page views are sent from `MetaPixelRouteTracker` so App Router client navigations are covered.
 */
export function MetaPixel({ pixelId, nonce }: MetaPixelProps) {
  const initScript = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(pixelId)});`;

  return (
    <>
      <Script id="meta-pixel-fbq" nonce={nonce} strategy="afterInteractive">
        {initScript}
      </Script>
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
    </>
  );
}
