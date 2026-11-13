import test from 'node:test';
import assert from 'node:assert/strict';
import { readSource, sourceFilesMatching, sourceLinesMatching } from '../sourceScan.js';

// The pieces every page is made of, each drawn in one place: the page frame,
// its header, the top bar's buttons, a list's rows, a row's remove button.
// A page that writes one of them out again is one a restyle never reaches.
// The files allowed below besides each piece's home are pages not moved onto
// it yet.

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

// Every page, the sheet, the builder and the battle map included: one bar
// and one paper, both drawn by AppPage (the bar imported nowhere else, the
// paper spread or passed as an sx nowhere else; the theme lays its halftone
// on the body). A bar of a page's own (an MUI AppBar
// or Toolbar) is a second app bar.
test('a page is framed by AppPage', () => {
  assert.deepEqual(sourceFilesMatching(/<AppTopBar\b|\/AppTopBar\.jsx'/, {
    allow: ['app/navigation/AppPage.jsx'],
  }), []);
  assert.deepEqual(sourceFilesMatching(/\.\.\.SURFACES\.page\b|[{[,]\s*SURFACES\.page\s*[}\],]/, {
    allow: ['app/navigation/AppPage.jsx'],
  }), []);
  assert.deepEqual(sourceFilesMatching(/<(AppBar|Toolbar)\b/), []);
});

test('a page header is the PageHeader', () => {
  assert.deepEqual(sourceFilesMatching(/clamp\(1\.3rem, 4vw, 1\.7rem\)|size=\{30\} strokeWidth=\{1\.5\}/, {
    allow: ['shared/ui/PageHeader.jsx'],
  }), []);
});

// A top bar's button is a TopBarButton: its look is never put together by
// hand from appTopBarButtonSx.
test("a top bar's button is a TopBarButton", () => {
  assert.deepEqual(sourceFilesMatching(/\bappTopBarButtonSx\b/, {
    allow: ['shared/ui/TopBarButton.jsx', 'shared/ui/appBar.js', 'shared/ui/iconOnlyOnPhone.js'],
  }), []);
});

// A word a phone has no room for is dropped through phoneHiddenLabelSx, the
// one rule for it: a top bar button's label (TopBarButton), the word "rest" of
// SheetActions, a roller's verb (RollerVerb), the dice pill's Roll and Log
// (DiceControl).
test('a word dropped on a phone goes through phoneHiddenLabelSx', () => {
  assert.deepEqual(sourceFilesMatching(/\bphoneHiddenLabelSx\b/, {
    allow: [
      'shared/ui/iconOnlyOnPhone.js', 'shared/ui/TopBarButton.jsx', 'pages/charsheet/layout/SheetActions.jsx',
      'shared/character/dice/RollerVerb.jsx', 'shared/character/dice/DiceControl.jsx',
    ],
  }), []);
});

test('a list row is an EntityRow, or takes LIST_ROW_SX', () => {
  assert.deepEqual(sourceFilesMatching(/\.\.\.SURFACES\.wash,\s*display: 'flex',\s*alignItems: 'center'/), []);
});

test('a button that removes something is a TipIconButton marked danger', () => {
  assert.deepEqual(filesWithTag('TipIconButton', /color="error"/), []);
  assert.deepEqual(filesWithTag('IconButton', /color="error"|sx=\{dangerActionSx\}/, {
    allow: ['shared/ui/TipIconButton.jsx'],
  }), []);
});

// Launch and its initiative options are one pair, LaunchButtons, in the
// builder's Encounter panel and on every library card.
test('a launch is LaunchButtons', () => {
  assert.deepEqual(sourceFilesMatching(/InitiativeLaunchDialog\.jsx'/, {
    allow: ['pages/encounterbuilder/builder/LaunchButtons.jsx'],
  }), []);
  assert.deepEqual(sourceLinesMatching(/>\s*Launch\s*</, {
    allow: ['pages/encounterbuilder/builder/LaunchButtons.jsx'],
  }), []);
});

test('the focus ring is focusRingSx', () => {
  assert.deepEqual(sourceFilesMatching(/outlineColor: 'primary\.main'|2px solid \$\{theme\.palette\.primary\.main\}/, {
    allow: ['shared/ui/interactive.js'],
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
