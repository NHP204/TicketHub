// Màu khu vực: gán theo giá giảm dần, lặp lại sau 4 màu. Class viết đủ tên để Tailwind nhận ra.
export const ZONE_STYLES = [
  { border: 'border-2 border-zone-1', hover: 'hover:bg-zone-1/10', swatch: 'bg-zone-1' },
  { border: 'border-2 border-zone-2', hover: 'hover:bg-zone-2/10', swatch: 'bg-zone-2' },
  { border: 'border-2 border-zone-3', hover: 'hover:bg-zone-3/10', swatch: 'bg-zone-3' },
  { border: 'border-2 border-zone-4', hover: 'hover:bg-zone-4/10', swatch: 'bg-zone-4' },
];

// Khu vực theo giá giảm dần; bằng giá thì giữ thứ tự gốc (sort ổn định).
export function sortSectionsByPrice(sections) {
  return [...sections].sort((a, b) => b.price - a.price);
}

// id khu vực → số thứ tự màu (0–3).
export function assignZones(sections) {
  return new Map(
    sortSectionsByPrice(sections).map((section, rank) => [section.id, rank % ZONE_STYLES.length]),
  );
}
