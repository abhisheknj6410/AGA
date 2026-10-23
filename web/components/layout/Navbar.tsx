"use client";

import React from 'react';
import {
  Navbar as HeroNavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Chip,
  Tabs,
  Tab
} from '@heroui/react';
import { Case } from '../../types/graph';
import { fetchCourtPacket } from '../../api/client';
import {
  Network,
  Bot,
  GitBranch,
  ShieldCheck,
  Plus,
  Sun,
  Moon,
  FolderOpen,
  Sparkles,
  Link2,
  Calendar,
  Layers,
  Activity,
  ChevronDown,
  MessageSquare,
  FileBadge,
  Settings
} from 'lucide-react';
import { SettingsModal } from '../settings/SettingsModal';

interface NavbarProps {
  cases: Case[];
  currentCase: Case | null;
  onSelectCase: (c: Case) => void;
  onNewCase: () => void;
  activeTab: 'GRAPH' | 'CHAT' | 'INGEST' | 'POSSIBILITIES' | 'INTELLIGENCE';
  onTabChange: (tab: 'GRAPH' | 'CHAT' | 'INGEST' | 'POSSIBILITIES' | 'INTELLIGENCE') => void;
  onAddNode: (category: 'ENTITY' | 'EVENT' | 'EVIDENCE') => void;
  onAddEdge: () => void;
  possibilityCount: number;
  nodeCount: number;
  edgeCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cases,
  currentCase,
  onSelectCase,
  onNewCase,
  activeTab,
  onTabChange,
  onAddNode,
  onAddEdge,
  possibilityCount,
  nodeCount,
  edgeCount,
  theme,
  onToggleTheme
}) => {
  const [isExporting, setIsExporting] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const handleExportCourtPacket = async () => {
    if (!currentCase) return;
    setIsExporting(true);
    try {
      const packet = await fetchCourtPacket(currentCase.id);
      const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `court_packet_${currentCase.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <HeroNavbar
      maxWidth="full"
      isBordered
      className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 h-16 px-4"
    >
      {/* Left: Brand + Case Switcher */}
      <NavbarBrand className="gap-3 max-w-[280px]">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center shadow-sm shadow-teal-500/20 text-white">
          <Network className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
            Evidence Studio
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <Dropdown>
              <DropdownTrigger>
                <Button
                  size="sm"
                  variant="light"
                  className="h-6 px-1.5 text-xs text-slate-600 dark:text-zinc-400 font-medium hover:text-slate-900"
                  endContent={<ChevronDown className="w-3 h-3 text-slate-400 opacity-60" />}
                >
                  <span className="truncate max-w-[120px]">
                    {currentCase?.name || 'Select Case'}
                  </span>
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Case selection"
                selectedKeys={currentCase ? [currentCase.id] : []}
                selectionMode="single"
                onSelectionChange={(keys) => {
                  const id = Array.from(keys)[0] as string;
                  const found = cases.find(c => c.id === id);
                  if (found) onSelectCase(found);
                }}
              >
                {cases.map((c) => (
                  <DropdownItem key={c.id} description={c.description || 'Forensic investigation'}>
                    {c.name}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>

            <Button
              isIconOnly
              size="sm"
              variant="flat"
              radius="full"
              className="w-5 h-5 min-w-5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
              onPress={onNewCase}
              title="Create New Case"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </NavbarBrand>

      {/* Center: Clean Segmented HeroUI Tabs (4 Primary Modes) */}
      <NavbarContent className="hidden md:flex gap-4" justify="center">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => onTabChange(key as any)}
          variant="solid"
          radius="full"
          color="primary"
          classNames={{
            tabList: "bg-slate-100 dark:bg-zinc-800/70 p-1 border border-slate-200/60 dark:border-zinc-700/60",
            cursor: "bg-teal-600 dark:bg-teal-500 shadow-sm",
            tab: "h-8 px-4 text-xs font-semibold text-slate-600 dark:text-zinc-400",
            tabContent: "group-data-[selected=true]:text-white font-medium flex items-center gap-2"
          }}
        >
          <Tab
            key="GRAPH"
            title={
              <div className="flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5" />
                <span>Crime Graph</span>
                <span className="text-[10px] opacity-75 font-mono">({nodeCount})</span>
              </div>
            }
          />
          <Tab
            key="CHAT"
            title={
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-teal-500" />
                <span>Detective Chat</span>
              </div>
            }
          />
          <Tab
            key="INGEST"
            title={
              <div className="flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" />
                <span>Add Evidence</span>
              </div>
            }
          />
          <Tab
            key="POSSIBILITIES"
            title={
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                <span>Theories</span>
                {possibilityCount > 0 && (
                  <Chip size="sm" variant="flat" color="warning" className="h-4 px-1 text-[9px]">
                    {possibilityCount}
                  </Chip>
                )}
              </div>
            }
          />
          <Tab
            key="INTELLIGENCE"
            title={
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Next Steps</span>
              </div>
            }
          />
        </Tabs>
      </NavbarContent>

      {/* Right: Quick Fact Addition & Controls */}
      <NavbarContent justify="end" className="gap-2">
        <Button
          size="sm"
          variant="flat"
          radius="lg"
          color="secondary"
          isLoading={isExporting}
          className="font-semibold text-xs h-8 px-3 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-850/60"
          startContent={!isExporting && <FileBadge className="w-3.5 h-3.5" />}
          onPress={handleExportCourtPacket}
          title="Export Court-Admissible Packet (FRE 702 / SHA-256 Signed)"
        >
          Court Dossier
        </Button>

        <Dropdown>
          <DropdownTrigger>
            <Button
              size="sm"
              color="primary"
              variant="shadow"
              radius="lg"
              className="font-semibold text-xs h-8 px-3.5 bg-teal-600 text-white shadow-teal-500/20"
              startContent={<Plus className="w-3.5 h-3.5" />}
            >
              Add Fact
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label="Add graph items">
            <DropdownItem
              key="entity"
              startContent={<span className="w-2.5 h-2.5 rounded-full bg-teal-500" />}
              description="Person, Organization, Location, Asset"
              onPress={() => onAddNode('ENTITY')}
            >
              Add Person / Place
            </DropdownItem>
            <DropdownItem
              key="event"
              startContent={<span className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
              description="Timestamped Action, Swipe, Occurrence"
              onPress={() => onAddNode('EVENT')}
            >
              Add Event / Action
            </DropdownItem>
            <DropdownItem
              key="evidence"
              startContent={<span className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
              description="CCTV, Forensic Log, Sensor, Audio"
              onPress={() => onAddNode('EVIDENCE')}
            >
              Add Evidence File / Log
            </DropdownItem>
            <DropdownItem
              key="edge"
              startContent={<Link2 className="w-3.5 h-3.5 text-slate-500" />}
              description="Connect two facts with a cause or link"
              onPress={onAddEdge}
            >
              Connect Facts
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>

        {/* Theme Switcher */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          radius="full"
          className="w-8 h-8 text-slate-600 dark:text-zinc-400"
          onPress={onToggleTheme}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </Button>

        {/* Settings Button */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          radius="full"
          className="w-8 h-8 text-slate-600 dark:text-zinc-400 hover:text-slate-900"
          onPress={() => setIsSettingsOpen(true)}
          title="API Keys & Model Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </NavbarContent>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </HeroNavbar>
  );
};
