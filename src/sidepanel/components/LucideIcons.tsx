import {
  Accessibility,
  AlignLeft,
  Archive,
  Ban,
  Copy,
  Crosshair,
  Download,
  Droplet,
  FolderInput,
  GripVertical,
  Heading,
  Image as ImageIcon,
  LayoutGrid,
  LayoutPanelLeft,
  LayoutTemplate,
  Link,
  List,
  Menu,
  MoreVertical,
  MousePointerClick,
  RefreshCw,
  ScanSearch,
  Table2,
  Tag,
  TextCursorInput,
  Trash2,
  Type,
  User,
  X,
} from 'lucide-react'

const STROKE = { strokeWidth: 1.75 }

export function GripIcon() {
  return <GripVertical size={16} {...STROKE} aria-hidden="true" />
}

export function DockIcon() {
  return <LayoutPanelLeft size={16} {...STROKE} aria-hidden="true" />
}

export function MenuIcon() {
  return <MoreVertical size={16} {...STROKE} aria-hidden="true" />
}

export function CloseIcon() {
  return <X size={16} {...STROKE} aria-hidden="true" />
}

export function OverviewIcon() {
  return <LayoutGrid size={18} {...STROKE} aria-hidden="true" />
}

export function ColorsIcon() {
  return <Droplet size={18} {...STROKE} aria-hidden="true" />
}

export function TypeIcon() {
  return <Type size={18} {...STROKE} aria-hidden="true" />
}

export function ContentIcon() {
  return <AlignLeft size={18} {...STROKE} aria-hidden="true" />
}

export function HeadingBlockIcon() {
  return <Heading size={16} {...STROKE} aria-hidden="true" />
}

export function ParagraphBlockIcon() {
  return <AlignLeft size={16} {...STROKE} aria-hidden="true" />
}

export function ListBlockIcon() {
  return <List size={16} {...STROKE} aria-hidden="true" />
}

export function LinkBlockIcon() {
  return <Link size={16} {...STROKE} aria-hidden="true" />
}

export function ButtonBlockIcon() {
  return <MousePointerClick size={16} {...STROKE} aria-hidden="true" />
}

export function NavBlockIcon() {
  return <Menu size={16} {...STROKE} aria-hidden="true" />
}

export function LabelBlockIcon() {
  return <Tag size={16} {...STROKE} aria-hidden="true" />
}

export function PlaceholderBlockIcon() {
  return <TextCursorInput size={16} {...STROKE} aria-hidden="true" />
}

export function TableBlockIcon() {
  return <Table2 size={16} {...STROKE} aria-hidden="true" />
}

export function AriaBlockIcon() {
  return <Accessibility size={16} {...STROKE} aria-hidden="true" />
}

export function AssetsIcon() {
  return <ImageIcon size={18} {...STROKE} aria-hidden="true" />
}

export function ProfileIcon() {
  return <User size={18} {...STROKE} aria-hidden="true" />
}

export function ExportNavIcon() {
  return <FolderInput size={18} {...STROKE} aria-hidden="true" />
}

export function DownloadIcon() {
  return <Download size={14} {...STROKE} aria-hidden="true" />
}

export function CopyIcon() {
  return <Copy size={14} {...STROKE} aria-hidden="true" />
}

export function InspectIcon() {
  return <Crosshair size={14} {...STROKE} aria-hidden="true" />
}

export function GridViewIcon() {
  return <LayoutGrid size={14} {...STROKE} aria-hidden="true" />
}

export function ListViewIcon() {
  return <List size={14} {...STROKE} aria-hidden="true" />
}

export function IdentifyMenuIcon() {
  return <ScanSearch size={16} {...STROKE} aria-hidden="true" />
}

export function ScanMenuIcon() {
  return <RefreshCw size={16} {...STROKE} aria-hidden="true" />
}

export function CancelMenuIcon() {
  return <Ban size={16} {...STROKE} aria-hidden="true" />
}

export function ExportMenuIcon() {
  return <Archive size={16} {...STROKE} aria-hidden="true" />
}

export function LayoutMenuIcon() {
  return <LayoutTemplate size={16} {...STROKE} aria-hidden="true" />
}

export function ClearMenuIcon() {
  return <Trash2 size={16} {...STROKE} aria-hidden="true" />
}
