import React from "react";
import { EosExhibitor } from "../../types/eos-events";

interface VenueGridProps {
  grid: { cols: number; rows: number };
  slots: Array<{ id: string; x: number; y: number }>;
  exhibitors: EosExhibitor[];
  editable?: boolean;
  onSlotClick?: (slotId: string, x: number, y: number) => void;
  onCellClick?: (x: number, y: number) => void;
}

export const VenueGrid: React.FC<VenueGridProps> = ({
  grid,
  slots,
  exhibitors,
  editable,
  onSlotClick,
  onCellClick,
}) => {
  const { cols, rows } = grid;

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 50px)`,
    gap: "4px",
    padding: "10px",
  };

  const getExhibitorAt = (x: number, y: number) => {
    return exhibitors.find(
      (e) =>
        e.boothLocation && e.boothLocation.x === x && e.boothLocation.y === y,
    );
  };

  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const slot = slots.find((s) => s.x === x && s.y === y);
      const exhibitor = getExhibitorAt(x, y);

      cells.push(
        <div
          key={`${x}-${y}`}
          className={`
                    border rounded text-xs flex items-center justify-center cursor-pointer transition-colors
                    ${exhibitor ? "bg-primary/20 border-primary/40" : "bg-muted hover:bg-muted/80 border-border"}
                    ${!slot && !exhibitor ? (editable ? "bg-muted/30 border-dashed border-muted-foreground/30" : "bg-transparent border-transparent") : ""} 
                `}
          onClick={() => {
            if (slot) {
              onSlotClick?.(slot.id, x, y);
            } else if (editable) {
              onCellClick?.(x, y);
            }
          }}
          style={{ gridColumn: x + 1, gridRow: y + 1 }}
        >
          {exhibitor ? (
            <div
              className="text-center font-semibold text-primary truncate px-1"
              title={exhibitor.name}
            >
              {exhibitor.boothNumber || exhibitor.name}
            </div>
          ) : slot ? (
            <span className="text-muted-foreground/50">Slot</span>
          ) : null}
        </div>,
      );
    }
  }

  return (
    <div className="w-full overflow-auto p-4 border border-border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-2">Venue Map</h3>
      <div style={gridStyle} className="border border-border rounded">
        {cells}
      </div>
    </div>
  );
};
