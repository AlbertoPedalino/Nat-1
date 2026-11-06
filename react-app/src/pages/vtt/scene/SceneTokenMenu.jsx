import { useMemo } from 'react';
import { canMarkToken } from '../../../shared/vtt/scene/scene.js';
import { parseSourceRef } from '../../../shared/vtt/tokens/encounterSync.js';
import TokenMenu from '../tokens/TokenMenu.jsx';

// A piece's menu with what this viewer may do to it: the GM anything, a player
// their own pieces, and marks on any creature but not on somebody else's
// character.
export default function SceneTokenMenu({
  menu,
  onClose,
  visibleTokens,
  role,
  canMove,
  onSaveToken,
  onMarkToken,
  onTokenVitals,
  onObjectStyle,
  onTokenVisibility,
  onDeleteToken,
  gmTurnView,
  statBlockFor,
  openStatBlock,
  sheetChoices,
  openCharacterSheet,
}) {
  // The menu must edit the same character state the piece displays. The raw
  // map row deliberately has no sheet-owned HP or death saves, so using it here
  // made a dead character look like 0/0 and an innocent blur could write that
  // stale value back to the sheet.
  const menuToken = useMemo(
    () => visibleTokens.find((token) => token.id === menu?.tokenId) || null,
    [menu, visibleTokens],
  );

  return (
    <TokenMenu
      token={menuToken}
      anchor={menu?.at || null}
      canEdit={role.isGm}
      canMark={canMarkToken(menuToken, {
        isGm: role.isGm,
        ownedCharacterIds: role.ownedCharacterIds,
      })}
      canShowHp={role.isGm || canMove(menuToken)}
      // Reminders are marks like conditions, and answer to the same
      // question: anyone at the table may put one on a creature, nobody may
      // put one on somebody else's character.
      canSetEffects={canMarkToken(menuToken, {
        isGm: role.isGm,
        ownedCharacterIds: role.ownedCharacterIds,
      })}
      canSetDeathSaves={role.isGm || canMove(menuToken)}
      canStyleObject={Boolean(menuToken?.iconKey) && (role.isGm || canMove(menuToken))}
      canRemove={role.isGm || canMove(menuToken)}
      onClose={onClose}
      onSave={role.isGm ? onSaveToken : onMarkToken}
      onVitals={role.isGm ? onTokenVitals : null}
      onObjectStyle={onObjectStyle}
      onVisibility={role.isGm ? onTokenVisibility : undefined}
      onDelete={onDeleteToken}
      onStatBlock={gmTurnView && statBlockFor(parseSourceRef(menuToken?.sourceRef))
        ? (token) => openStatBlock(parseSourceRef(token.sourceRef))
        : null}
      onSheet={sheetChoices.some((entry) => entry.characterId === menuToken?.characterId)
        ? (token) => openCharacterSheet(token.characterId)
        : null}
    />
  );
}
