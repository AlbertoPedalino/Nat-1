import Caption from '../../../shared/ui/Caption.jsx';
import { ErrorLine } from '../../../shared/ui/LoadStatus.jsx';

// What keeps the hexcrawl from being played and saved from the map: no GM
// Board linked to the campaign, a clock that cannot be read, or an error
// reaching them. The panel and its settings dialog say it the same way.
export default function HexcrawlLinkWarnings({ board, clockLinked, error }) {
  return (
    <>
      {!board ? (
        <Caption component="p" tone="warning">
          No hexcrawl board is linked to this campaign. Open the GM Board, save it, and pick this
          campaign under Links.
        </Caption>
      ) : null}
      {board && !clockLinked ? (
        <Caption component="p" tone="warning">
          The campaign clock is not readable from here, so time and changes will not be saved.
        </Caption>
      ) : null}
      {error ? <ErrorLine>{error}</ErrorLine> : null}
    </>
  );
}
