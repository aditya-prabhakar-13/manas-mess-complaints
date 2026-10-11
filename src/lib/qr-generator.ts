/**
 * Pure SVG QR Code Generator.
 * Uses 'qrcode' library in pure SVG mode without canvas or native binaries.
 */
import QRCode from "qrcode";

export async function generatePortalQrSvg(targetUrl?: string): Promise<string> {
  const url =
    targetUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://manas-mess.iitg.ac.in";

  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    width: 256,
  });

  return svg;
}
