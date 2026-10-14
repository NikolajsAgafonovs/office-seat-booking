// Footer notes (ui.md Layout 5): placeholder seat codes (O-13), traced geometry (C-2),
// meeting rooms out of scope (C-1).
export function Footer() {
  return (
    <footer>
      Seat codes are placeholders (<span className="mono">A-</span> east,{' '}
      <span className="mono">B-</span> west; O-13). Desk positions are traced from a low-resolution
      slide image, so expect small differences from the real floor (C-2). Meeting rooms are out of
      scope (C-1).
    </footer>
  );
}
