/**
 * Utility to export and download a rendered SVG QR code as a high-resolution offline PNG boarding pass.
 * Replicates the authentic gate boarding pass design and layout from the landing page hero section.
 */

export interface QrDownloadOptions {
  filename?: string;
  title?: string;
  subtitle?: string;
  origin?: string;
  originCode?: string;
  destination?: string;
  destinationCode?: string;
  date?: string;
  departureTime?: string;
  seatInfo?: string;
  passengerCount?: number;
  passengerName?: string;
  bookingRef?: string;
  gateStatus?: string;
}

const CITY_CODES: Record<string, string> = {
  "davao city": "DVO",
  "davao": "DVO",
  "dvo": "DVO",
  "cagayan de oro": "CDO",
  "cagayan de oro city": "CDO",
  "cagayan": "CDO",
  "cdo": "CDO",
  "cgy": "CDO",
  "cotabato city": "COT",
  "cotabato": "COT",
  "cot": "COT",
  "general santos": "GES",
  "general santos city": "GES",
  "gensan": "GES",
  "ges": "GES",
  "gen": "GES",
  "butuan city": "BXU",
  "butuan": "BXU",
  "bxu": "BXU",
  "but": "BXU",
  "zamboanga city": "ZAM",
  "zamboanga": "ZAM",
  "zam": "ZAM",
  "iligan city": "ILG",
  "iligan": "ILG",
  "ilg": "ILG",
  "manila": "MNL",
  "mnl": "MNL",
  "cebu": "CEB",
  "ceb": "CEB",
  "baguio": "BAG",
  "baguio city": "BAG",
  "bag": "BAG",
  "batangas": "BTG",
  "batangas city": "BTG",
  "btg": "BTG",
  "tacloban": "TAC",
  "tacloban city": "TAC",
  "tac": "TAC",
  "bacolod": "BCD",
  "bacolod city": "BCD",
  "bcd": "BCD",
  "pasay": "PSY",
  "pasay city": "PSY",
  "psy": "PSY",
  "cubao": "CUB",
  "cub": "CUB",
  "san fernando": "SFE",
  "san fernando city": "SFE",
  "sfe": "SFE",
  "panglao": "PGL",
  "pgl": "PGL",
  "tagbilaran": "TAG",
  "tagbilaran city": "TAG",
  "tag": "TAG",
  "jagna": "JAG",
  "jag": "JAG",
};

export function getCityCode(cityName: string): string {
  const clean = (cityName || "").trim().toLowerCase();
  if (CITY_CODES[clean]) return CITY_CODES[clean];
  const withoutCity = clean.replace(/\s+city$/, "");
  if (CITY_CODES[withoutCity]) return CITY_CODES[withoutCity];
  const letters = clean.replace(/[^a-z]/g, "");
  return letters.slice(0, 3).toUpperCase() || "TSX";
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function drawBusIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 24;
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawRoundedRect(ctx, 4, 3, 16, 17, 3);
  ctx.stroke();
  drawRoundedRect(ctx, 6, 6, 12, 5, 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(8, 15, 1, 0, Math.PI * 2);
  ctx.arc(16, 15, 1, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7, 20, 1.5, 0, Math.PI * 2);
  ctx.arc(17, 20, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPinIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 24;
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(12, 9, 6, Math.PI, 0, false);
  ctx.quadraticCurveTo(18, 14, 12, 22);
  ctx.quadraticCurveTo(6, 14, 6, 9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(12, 9, 2.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawArrowIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 24;
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(4, 12);
  ctx.lineTo(20, 12);
  ctx.moveTo(14, 6);
  ctx.lineTo(20, 12);
  ctx.lineTo(14, 18);
  ctx.stroke();
  ctx.restore();
}

function drawCalendarIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 24;
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawRoundedRect(ctx, 3, 4, 18, 17, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(3, 9);
  ctx.lineTo(21, 9);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, 2);
  ctx.lineTo(8, 5);
  ctx.moveTo(16, 2);
  ctx.lineTo(16, 5);
  ctx.stroke();
  ctx.restore();
}

function drawClockIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 24;
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.arc(12, 12, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(12, 7);
  ctx.lineTo(12, 12);
  ctx.lineTo(16, 14);
  ctx.stroke();
  ctx.restore();
}

function drawArmchairIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 24;
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawRoundedRect(ctx, 7, 3, 10, 12, 2);
  ctx.stroke();
  drawRoundedRect(ctx, 5, 14, 14, 5, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, 11);
  ctx.lineTo(4, 18);
  ctx.moveTo(20, 11);
  ctx.lineTo(20, 18);
  ctx.stroke();
  ctx.restore();
}

function drawShieldCheckIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 24;
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(12, 2);
  ctx.lineTo(20, 6);
  ctx.quadraticCurveTo(20, 14, 12, 22);
  ctx.quadraticCurveTo(4, 14, 4, 6);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8.5, 12);
  ctx.lineTo(11, 14.5);
  ctx.lineTo(15.5, 9.5);
  ctx.stroke();
  ctx.restore();
}

function drawUsersIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 24;
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.arc(9, 7, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(3, 19);
  ctx.quadraticCurveTo(3, 14, 9, 14);
  ctx.quadraticCurveTo(15, 14, 15, 19);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(17, 8, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(15, 15);
  ctx.quadraticCurveTo(18, 14, 21, 19);
  ctx.stroke();
  ctx.restore();
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
    const title = options.title || "TRIPSYNC BOARDING PASS";

    // Parse route details if not explicitly passed
    let origin = options.origin || "";
    let destination = options.destination || "";
    if ((!origin || !destination) && options.subtitle) {
      const parts = options.subtitle.split(/→|->/);
      if (parts.length >= 2) {
        origin = parts[0].trim();
        destination = parts[1].split("·")[0].trim();
      }
    }
    origin = origin || "Davao City";
    destination = destination || "Manila";

    const originCode = options.originCode || getCityCode(origin);
    const destCode = options.destinationCode || getCityCode(destination);
    const dateStr = options.date || "Sep 21, 2026";
    const depTime = options.departureTime || "06:00 AM";
    const seatInfo = options.seatInfo || "12A";
    const isGroup = (options.passengerCount && options.passengerCount > 1) || title.includes("GROUP");
    const gateStatus = options.gateStatus || "Gate Ready";

    // Clean tracking reference
    let bookingRef = options.bookingRef;
    if (!bookingRef) {
      const dateCompact = dateStr.replace(/[^0-9]/g, "");
      bookingRef = `#TS-${originCode}-${destCode}${dateCompact ? `-${dateCompact}` : ""}`;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(false);
      return;
    }

    const width = 600;
    const hasManifest = Boolean(options.passengerName || (options.passengerCount && options.passengerCount > 1));
    const height = hasManifest ? 790 : 740;

    // Retina 2x scale for ultra-sharp HD PNG
    const dpr = 2;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // 1. Crisp canvas background
      ctx.fillStyle = "#f8fafc"; // Soft modern neutral canvas
      ctx.fillRect(0, 0, width, height);

      // 2. Main Ticket Card bounds
      const cardX = 20;
      const cardY = 20;
      const cardW = width - 40; // 560
      const cardH = height - 40;

      // Draw outer card with subtle drop shadow
      ctx.save();
      ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = "#ffffff";
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 24);
      ctx.fill();
      ctx.restore();

      // Card border
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 24);
      ctx.stroke();

      // 3. Pass Header (Line 77-85 of HeroSection.tsx)
      const headerY = 50;
      drawBusIcon(ctx, cardX + 22, headerY - 14, 20, "#2563eb");

      ctx.fillStyle = "#0f172a";
      ctx.font = "800 12.5px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(title.toUpperCase(), cardX + 50, headerY + 1);

      // Gate Ready emerald status badge
      const badgeW = 92;
      const badgeH = 25;
      const badgeX = cardX + cardW - badgeW - 22;
      const badgeY = headerY - 14;
      ctx.fillStyle = "#ecfdf5";
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 12.5);
      ctx.fill();
      ctx.strokeStyle = "#a7f3d0";
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 12.5);
      ctx.stroke();

      // Emerald indicator dot & text
      ctx.beginPath();
      ctx.arc(badgeX + 13, badgeY + 12.5, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.fill();

      ctx.fillStyle = "#047857";
      ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(gateStatus, badgeX + 52, badgeY + 16.5);

      // Header divider line
      ctx.beginPath();
      ctx.moveTo(cardX + 20, headerY + 22);
      ctx.lineTo(cardX + cardW - 20, headerY + 22);
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Center Highlight: High-Contrast Scannable QR Code (Line 88-101 of HeroSection.tsx)
      const qrBoxSize = 200;
      const qrBoxX = (width - qrBoxSize) / 2;
      const qrBoxY = headerY + 36;

      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(15, 23, 42, 0.04)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 2;
      drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20);
      ctx.stroke();

      // Draw QR Image
      const qrImgPad = 14;
      ctx.drawImage(img, qrBoxX + qrImgPad, qrBoxY + qrImgPad, qrBoxSize - qrImgPad * 2, qrBoxSize - qrImgPad * 2);

      // Monospace Reference Code below QR
      ctx.fillStyle = "#2563eb";
      ctx.font = "600 12.5px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(bookingRef, width / 2, qrBoxY + qrBoxSize + 22);

      // 5. Perforation Line with Side Notches (Line 104-108 of HeroSection.tsx)
      const notchY = qrBoxY + qrBoxSize + 46;
      const notchR = 13;

      // Left notch cutout
      ctx.beginPath();
      ctx.arc(cardX, notchY, notchR, -Math.PI / 2, Math.PI / 2, false);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Right notch cutout
      ctx.beginPath();
      ctx.arc(cardX + cardW, notchY, notchR, Math.PI / 2, -Math.PI / 2, false);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dashed perforation line connecting the notches
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([6, 5]);
      ctx.moveTo(cardX + notchR + 4, notchY);
      ctx.lineTo(cardX + cardW - notchR - 4, notchY);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 6. Route Codes Below QR (Line 111-130 of HeroSection.tsx)
      const routeY = notchY + 34;

      // Origin Column
      const leftColX = cardX + 110;
      ctx.textAlign = "center";
      ctx.fillStyle = "#64748b";
      ctx.font = "600 11.5px system-ui, -apple-system, sans-serif";
      ctx.fillText("From", leftColX, routeY);

      ctx.fillStyle = "#0f172a";
      ctx.font = "800 28px system-ui, -apple-system, sans-serif";
      ctx.fillText(originCode, leftColX, routeY + 30);

      // Pin + Origin Name
      drawPinIcon(ctx, leftColX - 52, routeY + 38, 14, "#f97316");
      ctx.fillStyle = "#475569";
      ctx.font = "600 12.5px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(origin, leftColX - 34, routeY + 50);

      // Direct Arrow (Center Column)
      const centerColX = width / 2;
      drawArrowIcon(ctx, centerColX - 12, routeY + 12, 24, "#2563eb");
      ctx.fillStyle = "#64748b";
      ctx.font = "800 9.5px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("DIRECT", centerColX, routeY + 46);

      // Destination Column
      const rightColX = cardX + cardW - 110;
      ctx.textAlign = "center";
      ctx.fillStyle = "#64748b";
      ctx.font = "600 11.5px system-ui, -apple-system, sans-serif";
      ctx.fillText("To", rightColX, routeY);

      ctx.fillStyle = "#0f172a";
      ctx.font = "800 28px system-ui, -apple-system, sans-serif";
      ctx.fillText(destCode, rightColX, routeY + 30);

      // Pin + Destination Name
      drawPinIcon(ctx, rightColX - 52, routeY + 38, 14, "#06b6d4");
      ctx.fillStyle = "#475569";
      ctx.font = "600 12.5px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(destination, rightColX - 34, routeY + 50);

      // Divider above travel details
      const gridDividerY = routeY + 70;
      ctx.beginPath();
      ctx.moveTo(cardX + 20, gridDividerY);
      ctx.lineTo(cardX + cardW - 20, gridDividerY);
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 7. Travel Details Grid (Line 133-149 of HeroSection.tsx)
      const tileY = gridDividerY + 14;
      const tileGap = 12;
      const tileW = (cardW - 40 - tileGap * 2) / 3; // ~164
      const tileH = 72;

      // Helper for detail tile
      function drawDetailTile(tileCtx: CanvasRenderingContext2D, x: number, iconFn: () => void, label: string, value: string) {
        tileCtx.fillStyle = "#f8fafc";
        drawRoundedRect(tileCtx, x, tileY, tileW, tileH, 14);
        tileCtx.fill();
        tileCtx.strokeStyle = "#e2e8f0";
        tileCtx.lineWidth = 1;
        drawRoundedRect(tileCtx, x, tileY, tileW, tileH, 14);
        tileCtx.stroke();

        iconFn();

        tileCtx.fillStyle = "#64748b";
        tileCtx.font = "600 10.5px system-ui, -apple-system, sans-serif";
        tileCtx.textAlign = "center";
        tileCtx.fillText(label, x + tileW / 2, tileY + 40);

        tileCtx.fillStyle = "#0f172a";
        const valFontSize = value.length > 8 ? 12 : 14;
        tileCtx.font = `bold ${valFontSize}px system-ui, -apple-system, sans-serif`;
        tileCtx.fillText(value, x + tileW / 2, tileY + 58);
      }

      // Tile 1: Date
      const tile1X = cardX + 20;
      drawDetailTile(
        ctx,
        tile1X,
        () => drawCalendarIcon(ctx, tile1X + tileW / 2 - 8, tileY + 10, 16, "#2563eb"),
        "Date",
        dateStr
      );

      // Tile 2: Departure
      const tile2X = tile1X + tileW + tileGap;
      drawDetailTile(
        ctx,
        tile2X,
        () => drawClockIcon(ctx, tile2X + tileW / 2 - 8, tileY + 10, 16, "#f97316"),
        "Departure",
        depTime
      );

      // Tile 3: Seat / Seats
      const tile3X = tile2X + tileW + tileGap;
      drawDetailTile(
        ctx,
        tile3X,
        () => drawArmchairIcon(ctx, tile3X + tileW / 2 - 8, tileY + 10, 16, "#059669"),
        isGroup ? "Assigned Seats" : "Seat",
        seatInfo
      );

      // 8. Optional Passenger Manifest Row (for group bookings or named single passes)
      let footerBaseY = tileY + tileH + 24;
      if (hasManifest) {
        const manifestY = tileY + tileH + 12;
        const manifestW = cardW - 40;
        const manifestH = 34;
        const manifestX = cardX + 20;

        ctx.fillStyle = "#f1f5f9";
        drawRoundedRect(ctx, manifestX, manifestY, manifestW, manifestH, 10);
        ctx.fill();
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, manifestX, manifestY, manifestW, manifestH, 10);
        ctx.stroke();

        drawUsersIcon(ctx, manifestX + 12, manifestY + 8, 18, "#2563eb");

        ctx.fillStyle = "#334155";
        ctx.font = "600 11.5px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "left";

        const manifestText = options.passengerName
          ? `${options.passengerName}${options.passengerCount ? ` · ${options.passengerCount} Passengers` : ""} · 1 Combined Gate Pass`
          : `${options.passengerCount} Group Passengers · Single Gate Pass`;

        ctx.fillText(manifestText, manifestX + 38, manifestY + 22);

        footerBaseY = manifestY + manifestH + 18;
      }

      // 9. Offline Cryptographic Guarantee Footer
      drawShieldCheckIcon(ctx, width / 2 - 8, footerBaseY - 14, 16, "#059669");

      ctx.fillStyle = "#475569";
      ctx.font = "600 11px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✓ Cryptographically signed for offline gate verification", width / 2, footerBaseY + 14);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 9.5px system-ui, -apple-system, sans-serif";
      ctx.fillText("TripSync Transit System · Present pass on smartphone or printed copy", width / 2, footerBaseY + 28);

      // 10. Trigger PNG file download
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
