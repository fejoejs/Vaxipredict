/**
 * Generates a beautiful vector SVG default avatar containing the first letter
 * of the user's name centered on a deterministic colorful gradient background.
 */
export function generateDefaultAvatar(name: string): string {
  const char = name && name.trim() ? name.trim().charAt(0).toUpperCase() : "U";

  // Array of premium, curated gradient color pairings
  const gradients = [
    ["#ec4899", "#8b5cf6"], // Pink to Violet
    ["#3b82f6", "#10b981"], // Blue to Emerald
    ["#f59e0b", "#ef4444"], // Amber to Red
    ["#8b5cf6", "#6366f1"], // Violet to Indigo
    ["#06b6d4", "#3b82f6"], // Cyan to Blue
  ];

  // Select a gradient pairing deterministically based on character code
  const index = char.charCodeAt(0) % gradients.length;
  const [start, end] = gradients[index];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="grad-${index}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${start}" />
        <stop offset="100%" stop-color="${end}" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="50" fill="url(#grad-${index})" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', 'Inter', system-ui, sans-serif" font-size="48" font-weight="700" fill="#ffffff">${char}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
