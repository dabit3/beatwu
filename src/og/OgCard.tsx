import moggedUrl from "../../mogged.png";
import { PixelShades } from "../components/Avatars";
import { Starburst } from "../fx/Starburst";

/** The 1200×630 social preview, captured to public/og.jpg. */
export function OgCard() {
  return (
    <div className="og">
      <div className="og__rays" />
      <div className="og__dots" />

      <div className="og__left">
        <div className="og__logo">
          <span className="og__scott comic outline">SCOTT WU</span>
          <span className="og__row">
            <span className="og__vs">
              <Starburst fill="#ff3d54" points={12} seed={9} />
              <span className="comic outline">VS.</span>
            </span>
            <span className="og__you comic outline">YOU</span>
          </span>
        </div>
        <span className="og__ribbon comic">The Card Challenge</span>
        <p className="og__tag caption">
          Use every card. Hit 2025.
          <br />
          Beat Scott's 13.2 seconds.
        </p>
      </div>

      <div className="og__panel">
        <div className="og__frame">
          <img src={moggedUrl} alt="" />
          <div className="og__aura" />
          <div className="og__shades">
            <PixelShades />
          </div>
          <p className="og__bubble bubble bubble--left">that got too easy.</p>
        </div>
      </div>

      <div className="og__burst">
        <Starburst fill="#ffd23f" points={14} seed={21} />
        <span className="comic outline">
          +∞
          <br />
          AURA
        </span>
      </div>
      <div className="og__stamp comic">Don't get mogged.</div>
    </div>
  );
}

/** 180×180 home-screen icon, captured to public/apple-touch-icon.png. */
export function OgIcon() {
  return (
    <div className="og-icon">
      <Starburst fill="#ffd23f" points={12} seed={9} strokeWidth={6} />
      <span className="comic outline">VS.</span>
    </div>
  );
}
