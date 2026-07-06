import { useDashboardData } from '@/hooks/useDashboardData';
import type { Werkzeuguebersicht } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconSettings, IconPackage,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import {
  TableWidget, TableSkeleton, TableError, TableEmpty,
  type TableColumn, type TableRow,
} from '@/components/widgets/TableWidget';
import {
  RecordOverlay,
  RecordHeader,
  RecordSection,
  RecordField,
  RecordAttachments,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { WerkzeuguebersichtDialog } from '@/components/dialogs/WerkzeuguebersichtDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { gruss, useClock, namen, undoToast } from '@/lib/polish';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

const APPGROUP_ID = '6a47826db6ae7f4cca0dc18d';
const REPAIR_ENDPOINT = '/claude/build/repair';

const ROW_PREFIX = 'werkzeug';

function werkzeugIdOf(row: TableRow<Werkzeuguebersicht>): string {
  return row.id.split(':')[1] ?? '';
}

export default function DashboardOverview() {
  const {
    werkzeuguebersicht,
    setWerkzeuguebersicht,
    loading,
    error,
    fetchAll,
  } = useDashboardData();

  const clock = useClock();
  const overlay = useRecordOverlayStack<{ type: string; id: string }>();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Werkzeuguebersicht | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Werkzeuguebersicht | null>(null);
  const [filterZustand, setFilterZustand] = useState<string | null>(null);

  // --- KPI computed values (all hooks before early returns) ---
  const total = werkzeuguebersicht.length;
  const defekte = useMemo(
    () => werkzeuguebersicht.filter(w => lookupKey(w.fields.zustand) === 'defekt'),
    [werkzeuguebersicht],
  );
  const inReparatur = useMemo(
    () => werkzeuguebersicht.filter(w => lookupKey(w.fields.zustand) === 'in_reparatur'),
    [werkzeuguebersicht],
  );
  const gesamtwert = useMemo(
    () => werkzeuguebersicht.reduce((s, w) => s + (w.fields.kaufpreis ?? 0), 0),
    [werkzeuguebersicht],
  );

  // Context line
  const neueste = useMemo(
    () => [...werkzeuguebersicht].sort((a, b) => (b.createdat ?? '').localeCompare(a.createdat ?? '')).slice(0, 3),
    [werkzeuguebersicht],
  );
  const contextLine = useMemo(() => {
    if (total === 0) return 'Noch keine Werkzeuge erfasst — lege das erste an.';
    const neuNames = namen(neueste.map(w => w.fields.name ?? '—'));
    if (defekte.length > 0) {
      const defNames = namen(defekte.map(w => w.fields.name ?? '—'));
      return `${total} Werkzeuge im Bestand. Defekt: ${defNames}.`;
    }
    return `${total} Werkzeuge im Bestand — zuletzt hinzugefügt: ${neuNames}.`;
  }, [total, defekte, neueste]);

  // Table rows (filtered)
  const rows = useMemo<TableRow<Werkzeuguebersicht>[]>(() => {
    const source = filterZustand
      ? werkzeuguebersicht.filter(w => lookupKey(w.fields.zustand) === filterZustand)
      : werkzeuguebersicht;
    return source.map(w => ({ id: `${ROW_PREFIX}:${w.record_id}`, data: w }));
  }, [werkzeuguebersicht, filterZustand]);

  const columns = useMemo<TableColumn<Werkzeuguebersicht>[]>(() => [
    {
      key: 'name',
      label: 'Name',
      accessor: r => r.data.fields.name,
      format: 'text',
      cardRole: 'title',
      priority: 100,
      filterable: true,
    },
    {
      key: 'kategorie',
      label: 'Kategorie',
      accessor: r => r.data.fields.kategorie,
      format: 'pill',
      cardRole: 'subtitle',
      filterable: true,
      priority: 80,
    },
    {
      key: 'hersteller',
      label: 'Hersteller',
      accessor: r => r.data.fields.hersteller,
      format: 'text',
      filterable: true,
      priority: 60,
    },
    {
      key: 'lagerort',
      label: 'Lagerort',
      accessor: r => r.data.fields.lagerort,
      format: 'text',
      filterable: true,
      priority: 60,
    },
    {
      key: 'zustand',
      label: 'Zustand',
      accessor: r => r.data.fields.zustand,
      format: 'pill',
      filterable: true,
      responsive: 'keep',
      priority: 90,
    },
    {
      key: 'kaufpreis',
      label: 'Kaufpreis',
      accessor: r => r.data.fields.kaufpreis,
      format: 'currency',
      align: 'right',
      aggregate: 'sum',
      priority: 70,
    },
  ], []);

  const openEdit = useCallback((w: Werkzeuguebersicht) => {
    setEditRecord(w);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const snapshot = [...werkzeuguebersicht];
    const id = deleteTarget.record_id;
    setWerkzeuguebersicht(prev => prev.filter(w => w.record_id !== id));
    overlay.close();
    setDeleteTarget(null);
    try {
      await LivingAppsService.deleteWerkzeuguebersichtEntry(id);
      undoToast(`${deleteTarget.fields.name ?? 'Werkzeug'} gelöscht.`, async () => {
        setWerkzeuguebersicht(snapshot);
      });
    } catch {
      setWerkzeuguebersicht(snapshot);
      fetchAll();
    }
  }, [deleteTarget, werkzeuguebersicht, setWerkzeuguebersicht, overlay, fetchAll]);

  // Defekte + In Reparatur for WorkList
  const problematisch = useMemo(
    () => [...defekte, ...inReparatur].slice(0, 10),
    [defekte, inReparatur],
  );

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const currentId = overlay.top?.id;
  const currentRecord = werkzeuguebersicht.find(w => w.record_id === currentId);

  return (
    <>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
            {gruss(clock)}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{contextLine}</p>
        </div>
        <Button
          onClick={() => { setEditRecord(null); setDialogOpen(true); }}
          className="shrink-0"
        >
          <IconPlus size={16} className="mr-1.5" />
          Werkzeug anlegen
        </Button>
      </div>

      <DashboardGrid
        variant="wide"
        kpis={
          <StatStrip>
            <StatStripItem
              title="Alle Werkzeuge"
              value={total}
              icon={<IconPackage size={16} className="text-muted-foreground" />}
              tone="default"
              onClick={() => setFilterZustand(null)}
              active={filterZustand === null}
            />
            <StatStripItem
              title="Defekt"
              value={defekte.length}
              icon={<IconAlertCircle size={16} className="text-muted-foreground" />}
              tone={defekte.length > 0 ? 'destructive' : 'default'}
              onClick={() => setFilterZustand(f => f === 'defekt' ? null : 'defekt')}
              active={filterZustand === 'defekt'}
            />
            <StatStripItem
              title="In Reparatur"
              value={inReparatur.length}
              icon={<IconSettings size={16} className="text-muted-foreground" />}
              tone={inReparatur.length > 0 ? 'warning' : 'default'}
              onClick={() => setFilterZustand(f => f === 'in_reparatur' ? null : 'in_reparatur')}
              active={filterZustand === 'in_reparatur'}
            />
            <StatStripItem
              title="Gesamtwert"
              value={formatCurrency(gesamtwert)}
              icon={<IconTool size={16} className="text-muted-foreground" />}
              tone="default"
            />
          </StatStrip>
        }
        primary={
          total === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-2xl border border-dashed border-border">
              <IconPackage size={48} className="text-muted-foreground" stroke={1.5} />
              <div className="text-center">
                <p className="font-semibold text-foreground">Noch kein Werkzeug erfasst</p>
                <p className="text-sm text-muted-foreground mt-0.5">Leg das erste Werkzeug an und behalte den Überblick.</p>
              </div>
              <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
                <IconPlus size={16} className="mr-1.5" />
                Erstes Werkzeug anlegen
              </Button>
            </div>
          ) : (
            <TableWidget
              columns={columns}
              rows={rows}
              locale="de"
              initialSort={{ key: 'name', dir: 'asc' }}
              searchPlaceholder="Werkzeug suchen …"
              exportable
              toneForRow={row => {
                const z = lookupKey(row.data.fields.zustand);
                if (z === 'defekt') return 'destructive';
                if (z === 'in_reparatur') return 'warning';
                return 'default';
              }}
              onRowClick={row => overlay.replace({ type: ROW_PREFIX, id: werkzeugIdOf(row) })}
              actions={[
                {
                  icon: IconPencil,
                  label: 'Bearbeiten',
                  onClick: row => openEdit(row.data),
                },
                {
                  icon: IconTrash,
                  label: 'Löschen',
                  tone: 'destructive',
                  onClick: row => setDeleteTarget(row.data),
                },
              ]}
            />
          )
        }
        aside={
          <>
            <WorkList
              title="Defekt & In Reparatur"
              items={problematisch.map(w => ({
                id: w.record_id,
                title: w.fields.name ?? '—',
                secondLine: (
                  <span>
                    <span className={lookupKey(w.fields.zustand) === 'defekt' ? 'text-destructive font-medium' : 'text-amber-600 font-medium'}>
                      {w.fields.zustand?.label ?? '—'}
                    </span>
                    {w.fields.lagerort ? <span className="text-muted-foreground"> · {w.fields.lagerort}</span> : null}
                  </span>
                ),
              }))}
              onItemClick={id => overlay.replace({ type: ROW_PREFIX, id })}
              empty={{ text: 'Alle Werkzeuge in einwandfreiem Zustand.' }}
            />
            <WorkList
              title="Zuletzt hinzugefügt"
              items={neueste.map(w => ({
                id: w.record_id,
                title: w.fields.name ?? '—',
                secondLine: (
                  <span className="text-muted-foreground">
                    {[w.fields.kategorie?.label, w.fields.hersteller, w.fields.kaufpreis != null ? formatCurrency(w.fields.kaufpreis) : undefined].filter(Boolean).join(' · ')}
                  </span>
                ),
              }))}
              onItemClick={id => overlay.replace({ type: ROW_PREFIX, id })}
              empty={{ text: 'Noch keine Werkzeuge erfasst.' }}
            />
          </>
        }
      />

      {/* Record Overlay */}
      <RecordOverlay
        open={overlay.open}
        onClose={overlay.close}
        ariaLabel="Werkzeug"
        onEdit={currentRecord ? () => openEdit(currentRecord) : undefined}
        editLabel="Bearbeiten"
      >
        {currentRecord && (
          <>
            <RecordHeader
              title={currentRecord.fields.name ?? '—'}
              subtitle={currentRecord.fields.zustand?.label}
              media={
                currentRecord.fields.bild
                  ? <img src={currentRecord.fields.bild} alt={currentRecord.fields.name ?? ''} className="w-full h-48 object-cover rounded-xl" />
                  : undefined
              }
            />
            <RecordSection title="Details" cols={2}>
              <RecordField label="Kategorie" value={currentRecord.fields.kategorie} format="pill" />
              <RecordField label="Zustand" value={currentRecord.fields.zustand} format="pill" />
              <RecordField label="Hersteller" value={currentRecord.fields.hersteller} />
              <RecordField label="Lagerort" value={currentRecord.fields.lagerort} />
              <RecordField label="Kaufpreis" value={currentRecord.fields.kaufpreis} format="currency" />
              <RecordField label="Kaufdatum" value={currentRecord.fields.kaufdatum} format="date" />
              <RecordField label="Seriennummer" value={currentRecord.fields.seriennummer} />
            </RecordSection>
            {currentRecord.fields.bemerkungen && (
              <RecordSection title="Bemerkungen">
                <RecordField label="" value={currentRecord.fields.bemerkungen} format="longtext" />
              </RecordSection>
            )}
            <RecordAttachments appId={APP_IDS.WERKZEUGUEBERSICHT} recordId={currentRecord.record_id} />
          </>
        )}
      </RecordOverlay>

      {/* Create / Edit Dialog */}
      <WerkzeuguebersichtDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={async fields => {
          if (editRecord) {
            await LivingAppsService.updateWerkzeuguebersichtEntry(editRecord.record_id, fields);
          } else {
            await LivingAppsService.createWerkzeuguebersichtEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editRecord?.fields}
        recordId={editRecord?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Werkzeuguebersicht']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Werkzeuguebersicht']}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Werkzeug löschen"
        description={`„${deleteTarget?.fields.name ?? 'Werkzeug'}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
