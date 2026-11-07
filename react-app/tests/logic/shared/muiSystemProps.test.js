import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const SRC = new URL('../../../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// MUI 9 removed system props: <Stack flexWrap="wrap">, <Box mt={1}>,
// <Typography fontWeight={700} color="text.secondary"> are silently ignored
// (the builder's level picks stopped wrapping and squeezed "10" to "1…").
// Styles go in `sx`.
const SYSTEM = new Set([
  'm', 'mt', 'mr', 'mb', 'ml', 'mx', 'my', 'p', 'pt', 'pr', 'pb', 'pl', 'px', 'py',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'padding', 'paddingTop', 'paddingRight',
  'paddingBottom', 'paddingLeft', 'display', 'overflow', 'textOverflow', 'visibility', 'whiteSpace',
  'flexBasis', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'alignContent', 'order', 'flex',
  'flexGrow', 'flexShrink', 'alignSelf', 'justifyItems', 'justifySelf', 'gap', 'rowGap', 'columnGap',
  'gridColumn', 'gridRow', 'gridTemplateColumns', 'gridTemplateRows', 'gridArea', 'position', 'zIndex',
  'top', 'right', 'bottom', 'left', 'color', 'bgcolor', 'backgroundColor', 'boxShadow', 'width', 'maxWidth',
  'minWidth', 'height', 'maxHeight', 'minHeight', 'border', 'borderColor', 'borderRadius', 'fontFamily',
  'fontSize', 'fontStyle', 'fontWeight', 'letterSpacing', 'lineHeight', 'textAlign', 'textTransform',
]);
const OWN = {
  Box: new Set(),
  Stack: new Set(['direction', 'spacing', 'divider', 'useFlexGap']),
  Grid: new Set(['container', 'size', 'offset', 'spacing', 'rowSpacing', 'columnSpacing', 'columns', 'direction', 'wrap']),
  Typography: new Set(['align']),
};
const TYPOGRAPHY_COLORS = new Set(['primary', 'secondary', 'error', 'warning', 'info', 'success', 'inherit',
  'textPrimary', 'textSecondary', 'textDisabled']);

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.jsx?$/.test(name)) out.push(path);
  }
  return out;
}

test('MUI layout components get their styles through sx, not removed system props', () => {
  const found = [];
  for (const file of sourceFiles(SRC)) {
    const code = readFileSync(file, 'utf8');
    if (!code.includes('@mui/material')) continue;
    const tree = parse(code, { sourceType: 'module', plugins: ['jsx'] });
    const local = new Map();
    tree.program.body.forEach((node) => {
      if (node.type !== 'ImportDeclaration') return;
      if (node.source.value === '@mui/material') {
        node.specifiers.forEach((s) => { if (s.type === 'ImportSpecifier' && OWN[s.imported.name]) local.set(s.local.name, s.imported.name); });
      }
      const single = /^@mui\/material\/(Box|Stack|Grid|Typography)$/.exec(node.source.value);
      if (single) node.specifiers.forEach((s) => { if (s.type === 'ImportDefaultSpecifier') local.set(s.local.name, single[1]); });
    });
    if (!local.size) continue;
    traverse(tree, {
      JSXOpeningElement(p) {
        const comp = p.node.name.type === 'JSXIdentifier' ? local.get(p.node.name.name) : null;
        if (!comp) return;
        p.node.attributes.forEach((attr) => {
          if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') return;
          const key = attr.name.name;
          if (!SYSTEM.has(key) || OWN[comp].has(key)) return;
          // Typography's own color takes palette names only; a theme path
          // ("text.secondary") or a computed colour belongs in sx.
          if (comp === 'Typography' && key === 'color'
            && attr.value?.type === 'StringLiteral' && TYPOGRAPHY_COLORS.has(attr.value.value)) return;
          found.push(`${relative(SRC, file).replace(/\\/g, '/')}:${attr.loc.start.line} <${comp} ${key}>`);
        });
      },
    });
  }
  assert.deepEqual(found, []);
});

// MUI 9 also dropped the old per-part props in favour of slotProps:
// TextField's inputProps/InputProps lost min, max, maxLength and labels, and
// ListItemText's secondaryTypographyProps its styling.
const REMOVED_PROPS = {
  TextField: ['inputProps', 'InputProps', 'InputLabelProps', 'FormHelperTextProps', 'SelectProps'],
  ListItemText: ['primaryTypographyProps', 'secondaryTypographyProps'],
};

test('TextField and ListItemText parts are styled through slotProps', () => {
  const found = [];
  for (const file of sourceFiles(SRC)) {
    const code = readFileSync(file, 'utf8');
    if (!code.includes('@mui/material')) continue;
    const tree = parse(code, { sourceType: 'module', plugins: ['jsx'] });
    const local = new Map();
    tree.program.body.forEach((node) => {
      if (node.type === 'ImportDeclaration' && node.source.value === '@mui/material') {
        node.specifiers.forEach((s) => { if (s.type === 'ImportSpecifier' && REMOVED_PROPS[s.imported.name]) local.set(s.local.name, s.imported.name); });
      }
    });
    if (!local.size) continue;
    traverse(tree, {
      JSXOpeningElement(p) {
        const comp = p.node.name.type === 'JSXIdentifier' ? local.get(p.node.name.name) : null;
        if (!comp) return;
        p.node.attributes.forEach((attr) => {
          if (attr.type === 'JSXAttribute' && REMOVED_PROPS[comp].includes(attr.name.name)) {
            found.push(`${relative(SRC, file).replace(/\\/g, '/')}:${attr.loc.start.line} <${comp} ${attr.name.name}>`);
          }
        });
      },
    });
  }
  assert.deepEqual(found, []);
});
