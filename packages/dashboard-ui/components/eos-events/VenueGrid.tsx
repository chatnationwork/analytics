import React from "react";
import { EosExhibitor } from "../../types/eos-events";

interface VenueGridProps {
  grid: { cols: number; rows: number };
  slots: Array<{ id: string; x: number; y: number }>;
  exhibitors: EosExhibitor[];
  onSlotClick?: (slotId: string) => void;
}

export const VenueGrid: React.FC<VenueGridProps> = ({
  grid,
  slots,
  exhibitors,
  onSlotClick,
}) => {
  const { cols, rows } = grid;

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 50px)`,
    gap: "4px",
    border: "1px solid #eee",
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
                    ${exhibitor ? "bg-blue-100 border-blue-300" : "bg-gray-50 hover:bg-gray-100"}
                    ${!slot && !exhibitor ? "bg-transparent border-none" : ""} 
                `}
          onClick={() => slot && onSlotClick?.(slot.id)}
          style={{ gridColumn: x + 1, gridRow: y + 1 }}
        >
          {exhibitor ? (
            <div
              className="text-center font-semibold text-blue-800 truncate px-1"
              title={exhibitor.name}
            >
              {exhibitor.boothNumber || exhibitor.name}
            </div>
          ) : slot ? (
            <span className="text-gray-300">Slot</span>
          ) : null}
        </div>,
      );
    }
  }

  return (
    <div className="w-full overflow-auto p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-2">Venue Map</h3>
      <div style={gridStyle}>{cells}</div>
    </div>
  );
};
