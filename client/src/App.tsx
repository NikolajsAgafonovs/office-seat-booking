// The one page (ui.md "Layout"): app bar, controls, workspace (map card + side panel),
// settings strip, footer, toast. No routing.
import { useEffect } from 'react';
import { formatLong } from '@seat/shared';
import { AppBar } from './components/AppBar';
import { BookTogether } from './components/BookTogether';
import { Controls } from './components/Controls';
import { DevSignIn } from './components/DevSignIn';
import { FloorMap } from './components/FloorMap';
import { Footer } from './components/Footer';
import { Legend } from './components/Legend';
import { MyBookings } from './components/MyBookings';
import { SeatCard } from './components/SeatCard';
import { SettingsStrip } from './components/SettingsStrip';
import { Stats } from './components/Stats';
import { Toast } from './components/Toast';
import { slotTitleSuffix } from './format';
import { useStore } from './store';

/** Map card title: "Floor map · {day}[ · morning|afternoon]" (ui.md Layout 3). */
function MapCard() {
  const date = useStore((s) => s.date);
  const slot = useStore((s) => s.slot);
  return (
    <section className="mapcard" aria-labelledby="mapTitle" data-testid="map-card">
      <div className="maphead">
        <h2 id="mapTitle">
          Floor map · {formatLong(date)}
          {slotTitleSuffix(slot)}
        </h2>
        <Stats />
      </div>
      <div className="mapwrap" data-testid="map-wrap">
        <FloorMap />
      </div>
      <Legend />
    </section>
  );
}

export function App() {
  const boot = useStore((s) => s.boot);
  const mode = useStore((s) => s.mode);
  const ready = useStore((s) => s.me !== null && s.floorPlan !== null);

  useEffect(() => {
    void boot();
  }, [boot]);

  return (
    <div className="app">
      <AppBar />
      {mode === 'unauthenticated' ? (
        <DevSignIn />
      ) : ready ? (
        <>
          <Controls />
          <div className="work">
            <MapCard />
            <aside className="side" data-testid="side-panel">
              <SeatCard />
              <BookTogether />
              <MyBookings />
            </aside>
          </div>
          <SettingsStrip />
        </>
      ) : (
        <p className="empty">Loading…</p>
      )}
      <Footer />
      <Toast />
    </div>
  );
}
