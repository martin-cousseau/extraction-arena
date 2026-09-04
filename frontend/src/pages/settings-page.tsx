import { useEffect, useState } from 'react';
import { Input } from '@/components/base/input/input';
import { SegmentedControl, SegmentedControlItem } from '@/components/base/segmented-control/segmented-control';
import { SwitchCard } from '@/components/base/switch/switch-card';
import { Chip } from '@/components/base/badges/chip';
import { ThemeToggle } from '@/components/application/theme/theme-toggle';
import { PageHeader, Surface } from '@/app/layout';
import { PIPELINE_LIST, type PipelineId } from '@/lib/harness';
import { useAppStore } from '@/store';

export function SettingsPage() {
  const zaiKey = useAppStore((s) => s.zaiKey);
  const openaiKey = useAppStore((s) => s.openaiKey);
  const xaiKey = useAppStore((s) => s.xaiKey);
  const llamaKey = useAppStore((s) => s.llamaKey);
  const selectedPipeline = useAppStore((s) => s.selectedPipeline);
  const setZaiKey = useAppStore((s) => s.setZaiKey);
  const setOpenaiKey = useAppStore((s) => s.setOpenaiKey);
  const setXaiKey = useAppStore((s) => s.setXaiKey);
  const setLlamaKey = useAppStore((s) => s.setLlamaKey);
  const setSelectedPipeline = useAppStore((s) => s.setSelectedPipeline);
  const [docaiConfigured, setDocaiConfigured] = useState<boolean | null>(null);
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    void fetch('/api/pipelines/docai')
      .then((r) => r.json())
      .then((j) => setDocaiConfigured(Boolean(j.configured)))
      .catch(() => setDocaiConfigured(false));
  }, []);

  return (
    <div>
      <PageHeader title="Settings" description="Theme, default pipeline, and API keys. Llama Cloud is read from the backend environment when present." />
      <div className="flex flex-col gap-4">
        <Surface>
          <p className="mb-3 text-headline-semibold">Appearance</p>
          <ThemeToggle appearance="sidebar-segmented" />
        </Surface>
        <Surface>
          <p className="mb-3 text-headline-semibold">Default pipeline</p>
          <SegmentedControl
            selectedKeys={new Set([selectedPipeline])}
            onSelectionChange={(keys) => {
              const id = [...keys][0] as PipelineId | undefined;
              if (id) setSelectedPipeline(id);
            }}
            aria-label="Default pipeline"
          >
            {PIPELINE_LIST.map((p) => (
              <SegmentedControlItem key={p.id} id={p.id}>
                {p.label}
                {p.deprecated ? ' (deprecated)' : ''}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </Surface>
        <Surface>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-headline-semibold">API keys</p>
            <Chip color={docaiConfigured ? 'lime' : 'yellow'}>
              DocAI backend {docaiConfigured ? 'configured' : 'missing env key'}
            </Chip>
          </div>
          <SwitchCard
            title="Show secrets"
            description="Keys stay in this browser session. The Llama Cloud key is forwarded only on DocAI runs."
            isSelected={showKeys}
            onChange={setShowKeys}
          />
          <div className="mt-4 flex flex-col gap-4">
            <Input
              label="Llama Cloud (session override)"
              type={showKeys ? 'text' : 'password'}
              value={llamaKey}
              onChange={setLlamaKey}
              hint="Optional. Canonical key is LLAMA_CLOUD_API_KEY on the backend."
            />
            <Input label="Z.AI (deprecated GLM)" type={showKeys ? 'text' : 'password'} value={zaiKey} onChange={setZaiKey} />
            <Input
              label="OpenAI (GPT-5.4 mini judge)"
              type={showKeys ? 'text' : 'password'}
              value={openaiKey}
              onChange={setOpenaiKey}
              hint="Used by Analyze with judge on a completed run. Not required for DocAI."
            />
            <Input label="xAI (deprecated Grok)" type={showKeys ? 'text' : 'password'} value={xaiKey} onChange={setXaiKey} />
          </div>
        </Surface>
      </div>
    </div>
  );
}
