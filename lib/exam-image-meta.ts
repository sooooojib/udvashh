/**
 * Utilities to parse and encode exam diagram metadata (width, line position)
 * into image URL hash parameters (e.g. #w=400&line=1) and localStorage.
 */

export interface ImageMeta {
  width?: number;
  line?: number;
}

export function parseImageMeta(src: string): ImageMeta {
  if (!src) return {};
  const clean = src.split("#")[0];
  let width: number | undefined;
  let line: number | undefined;

  const hash = src.includes("#") ? src.split("#")[1] : "";
  if (hash) {
    if (hash.includes("=") || hash.includes("&")) {
      const params = new URLSearchParams(hash);
      const w = params.get("w");
      if (w) width = parseInt(w, 10);
      const l = params.get("line");
      if (l !== null && l !== undefined && !isNaN(parseInt(l, 10))) {
        line = parseInt(l, 10);
      }
    } else {
      const wMatch = hash.match(/w=(\d+)/);
      if (wMatch) width = parseInt(wMatch[1], 10);
      const lMatch = hash.match(/line=(\d+)/);
      if (lMatch) line = parseInt(lMatch[1], 10);
    }
  }

  // Fallback to localStorage
  if (typeof window !== "undefined") {
    if (width === undefined) {
      const savedW = localStorage.getItem(`exam_img_w_${clean}`);
      if (savedW) width = parseInt(savedW, 10);
    }
    if (line === undefined) {
      const savedL = localStorage.getItem(`exam_img_line_${clean}`);
      if (savedL !== null && savedL !== undefined && !isNaN(parseInt(savedL, 10))) {
        line = parseInt(savedL, 10);
      }
    }
  }

  return {
    width: isNaN(width as number) ? undefined : width,
    line: isNaN(line as number) ? undefined : line,
  };
}

export function buildImageUrlWithMeta(src: string, meta: ImageMeta): string {
  const clean = src.split("#")[0];
  const params = new URLSearchParams();

  if (meta.width && !isNaN(meta.width)) {
    params.set("w", String(meta.width));
  }
  if (meta.line !== undefined && meta.line !== null && !isNaN(meta.line)) {
    params.set("line", String(meta.line));
  }

  const hash = params.toString();
  return hash ? `${clean}#${hash}` : clean;
}
