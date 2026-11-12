import test from 'node:test';
import assert from 'node:assert/strict';
import { readSource, sourceFilesMatching } from '../sourceScan.js';

// The pieces every page is made of, each drawn in one place: the page frame,
// its header, the top bar's buttons, a list's rows, a row's remove button.
// A page that writes one of them out again is one a restyle never reaches.
// The files allowed below besides each piece's home are pages not moved onto
// it yet (the sheet, the builder and the battle map keep bars of their own).

// A JSX element's opening tag from `start` (its "<") to its closing ">", over
// the braces of its props (an arrow function or an icon prop holds a ">").
function openingTag(text, start) {
  let depth = 0;
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    else if (char === '>' && depth === 0) return text.slice(start, index + 1);
  }
  return text.slice(start);
}

// The files where some opening tag of `tag` matches `pattern`.
function filesWithTag(tag, pattern, { allow = [] } = {}) {
  const opening = new RegExp(`<${tag}\\b`, 'g');
  return sourceFilesMatching(new RegExp(`<${tag}\\b`), { allow }).filter((file) => {
    const text = readSource(file);
    return [...text.matchAll(opening)].some(({ index }) => pattern.test(openingTag(text, index)));
  });
}

const OWN_BARS = ['pages/charbuilder/layout/BuilderAppBar.jsx', 'pages/charsheet/layout/TopBar.jsx', 'pages/vtt/VttPage.jsx'];

test('a page is framed by AppPage', () => {
  assert.deepEqual(sourceFilesMatching(/<AppTopBar\b/, {
    allow: ['app/navigation/AppPage.jsx', ...OWN_BARS],
  }), []);
  assert.deepEqual(sourceFilesMatching(/\.\.\.SURFACES\.page\b/, {
    allow: ['app/navigation/AppPage.jsx', 'pages/charbuilder/CharBuilder.jsx', 'pages/charsheet/CharacterSheet.jsx', 'pages/vtt/VttPage.jsx'],
  }), []);
});

test('a page header is the PageHeader', () => {
  assert.deepEqual(sourceFilesMatching(/clamp\(1\.3rem, 4vw, 1\.7rem\)|size=\{30\} strokeWidth=\{1\.5\}/, {
    allow: ['shared/ui/PageHeader.jsx'],
  }), []);
});

// SheetActions hides only the word "rest" of its own buttons on a phone.
test("a top bar's button is a TopBarButton", () => {
  assert.deepEqual(sourceFilesMatching(/\bappTopBarButtonSx\b|\bphoneHiddenLabelSx\b/, {
    allow: [
      'shared/ui/TopBarButton.jsx', 'shared/ui/appBar.js', 'shared/ui/iconOnlyOnPhone.js',
      'pages/charsheet/layout/SheetActions.jsx', ...OWN_BARS,
    ],
  }), []);
});

test('a list row is an EntityRow, or takes LIST_ROW_SX', () => {
  assert.deepEqual(sourceFilesMatching(/\.\.\.SURFACES\.wash,\s*display: 'flex',\s*alignItems: 'center'/), []);
});

// The four files allowed are pages not moved onto `danger` yet.
test('a button that removes something is a TipIconButton marked danger', () => {
  assert.deepEqual(filesWithTag('TipIconButton', /color="error"/, {
    allow: [
      'pages/dmscreen/notes/NoteCard.jsx', 'pages/encounterbuilder/combat/CombatantCard.jsx',
      'pages/vtt/scene/PicturesControls.jsx', 'pages/vtt/scene/ScenePicker.jsx',
    ],
  }), []);
  assert.deepEqual(filesWithTag('IconButton', /color="error"|sx=\{dangerActionSx\}/, {
    allow: ['shared/ui/TipIconButton.jsx'],
  }), []);
});

test('the launch with initiative options is the InitiativeLaunchButton', () => {
  assert.deepEqual(sourceFilesMatching(/InitiativeLaunchDialog\.jsx'/, {
    allow: ['pages/encounterbuilder/builder/InitiativeLaunchButton.jsx'],
  }), []);
});

// The GM Board's tab ring and its table editor's cell ring are the two not
// moved onto the recipe yet.
test('the focus ring is focusRingSx', () => {
  assert.deepEqual(sourceFilesMatching(/outlineColor: 'primary\.main'|2px solid \$\{theme\.palette\.primary\.main\}/, {
    allow: ['shared/ui/interactive.js', 'pages/gmboard/GmBoardPage.jsx', 'pages/gmboard/tables/TableEditorGrid.jsx'],
  }), []);
});

test("the compendium's filter bar and scrolling panes are its shared styles", () => {
  assert.deepEqual(sourceFilesMatching(/p: 1\.5,\s*borderBottom: INK_EDGE/, {
    allow: ['pages/compendium/compendiumStyles.js'],
  }), []);
  assert.deepEqual(sourceFilesMatching(/overflowY: 'auto'/, {
    allow: ['pages/compendium/compendiumStyles.js'],
  }).filter((file) => file.startsWith('pages/compendium/')), []);
  assert.deepEqual(sourceFilesMatching(/Back to results[\s\S]*Back to results/), []);
});
