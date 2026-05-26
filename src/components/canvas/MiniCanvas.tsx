import { CanvasState } from "@/types/canvas";
import { FONTS } from "@/lib/layout-utils";

export const MiniCanvas = ({
  state,
  aspectClass,
  isActive,
  onClick,
}: {
  state: CanvasState;
  aspectClass: string;
  isActive?: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={`relative w-full ${aspectClass} bg-muted/45 border-2 rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] ${
        isActive
          ? "border-primary ring-2 ring-primary/30 shadow-md"
          : "border-border/60 hover:border-border"
      }`}
    >
      {state.bgUrlSigned && (
        <img
          src={state.bgUrlSigned}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}
      {state.foregrounds.map((fg) => (
        <div
          key={fg.id}
          style={{
            position: "absolute",
            left: `${fg.x * 100}%`,
            top: `${fg.y * 100}%`,
            width: `${fg.size * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <img src={fg.url} alt="" className="w-full h-auto pointer-events-none" />
        </div>
      ))}
      {state.logo && (
        <div
          style={{
            position: "absolute",
            left: `${state.logo.x * 100}%`,
            top: `${state.logo.y * 100}%`,
            width: `${state.logo.size * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <img
            src={state.logo.signedUrl}
            alt=""
            className="w-full h-auto pointer-events-none"
          />
        </div>
      )}

    </button>
  );
};
