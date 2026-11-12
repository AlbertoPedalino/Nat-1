import { Stack } from '@mui/material';
import AppPage from './AppPage.jsx';
import LinkedToolsMenu from './LinkedToolsMenu.jsx';
import { TOOL_CATALOG } from './toolCatalog.js';
import InstanceConflictBanner from '../../shared/instances/InstanceConflictBanner.jsx';
import PageHeader from '../../shared/ui/PageHeader.jsx';

// The frame of a saved tool's page (GM Board, Encounter Builder, DM Screen):
// the app page with Home, Back to the tool's list and the Links menu in its
// bar, the conflict banner, the page header (the tool's icon, its title and
// the instance id), and the page's content.
//
// `actions` sit beside the title (below it on a phone); `children` is the
// content; `after` is what lives outside the column (dialogs, toasts).
// `maxWidth` is the column's width; `sx` adds to the page box.
export default function ToolPageShell({
  tool, sectionKey, title, backTo, backLabel, actions = null, maxWidth = 1500, sx, children, after = null,
}) {
  const catalog = TOOL_CATALOG[sectionKey];
  return (
    <AppPage
      dense
      maxWidth={maxWidth}
      sx={sx}
      after={after}
      topBar={{
        home: true,
        backTo,
        backLabel,
        children: <LinkedToolsMenu sectionKey={sectionKey} instanceId={tool.id} initialLinkGroupId={tool.linkGroupId} />,
      }}
    >
      <Stack spacing={2}>
        <InstanceConflictBanner tool={tool} />
        <PageHeader
          icon={catalog?.icon}
          iconColor={catalog?.color}
          title={title}
          subtitle={`Instance ${tool.id}`}
          actions={actions}
          sx={{ mb: 0 }}
        />
        {children}
      </Stack>
    </AppPage>
  );
}
