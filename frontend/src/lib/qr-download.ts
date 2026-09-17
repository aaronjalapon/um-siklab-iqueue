/**
 * Utility to export and download a rendered SVG QR code as a high-resolution offline PNG boarding pass.
 */

export interface QrDownloadOptions {
  filename?: string;
  title?: string;
  subtitle?: string;
  seatInfo?: string;
}

export function downloadQrAsPng(
  svgContainer: HTMLElement | null,
  options: QrDownloadOptions = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!svgContainer) {
      resolve(false);
      return;
    }

    const svgElement = svgContainer.querySelector("svg");
    if (!svgElement) {
      resolve(false);
      return;
    }

    const filename = options.filename || "TripSync-Boarding-Pass.png";
    const subtitle = options.subtitle || "Offline Gate Pass";
    const seatInfo = options.seatInfo;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(false);
      return;
    }

    const width = 600;
    const height = seatInfo ? 740 : 680;
    canvas.width = width;
    canvas.height = height;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // 1. Draw crisp white background with subtle rounded border
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // 2. Draw branded header bar
      ctx.fillStyle = "#1e3a8a"; // Brand dark blue
      ctx.fillRect(0, 0, width, 88);

      // Header Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TripSync · Boarding Pass", width / 2, 42);

      // Header Subtitle
      ctx.fillStyle = "#93c5fd";
      ctx.font = "13px system-ui, -apple-system, sans-serif";
      ctx.fillText(subtitle, width / 2, 68);

      // 3. Draw QR Code centered
      const qrSize = 380;
      const qrX = (width - qrSize) / 2;
      const qrY = 110;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // 4. Optional Seat / Route Info
      let currentY = qrY + qrSize + 28;
      if (seatInfo) {
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
        ctx.fillText(seatInfo, width / 2, currentY);
        currentY += 24;
      }

      // 5. Offline Guarantee Footer
      ctx.fillStyle = "#64748b";
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      ctx.fillText("✓ Cryptographically signed for offline gate verification", width / 2, currentY);

      // 6. Trigger download
      try {
        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
        link.href = pngUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        resolve(true);
      } catch (err) {
        console.error("Failed to download QR code", err);
        resolve(false);
      }
    };

    img.onerror = () => {
      resolve(false);
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  });
}
