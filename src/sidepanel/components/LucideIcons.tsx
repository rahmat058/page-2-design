import {
  Accessibility,
  AlignLeft,
  Copy,
  Crosshair,
  Download,
  Droplet,
  GripVertical,
  Heading,
  Image as ImageIcon,
  LayoutGrid,
  LayoutPanelLeft,
  Link,
  List,
  Menu,
  MoreVertical,
  MousePointerClick,
  Table2,
  Tag,
  TextCursorInput,
  Type,
  User,
  X,
} from 'lucide-react';

const STROKE = { strokeWidth: 1.75 };

export function GripIcon() {
  return <GripVertical size={16} {...STROKE} aria-hidden="true" />;
}

export function DockIcon() {
  return <LayoutPanelLeft size={16} {...STROKE} aria-hidden="true" />;
}

export function MenuIcon() {
  return <MoreVertical size={16} {...STROKE} aria-hidden="true" />;
}

export function CloseIcon() {
  return <X size={16} {...STROKE} aria-hidden="true" />;
}

export function OverviewIcon() {
  return <LayoutGrid size={18} {...STROKE} aria-hidden="true" />;
}

export function ColorsIcon() {
  return <Droplet size={18} {...STROKE} aria-hidden="true" />;
}

export function TypeIcon() {
  return <Type size={18} {...STROKE} aria-hidden="true" />;
}

export function ContentIcon() {
  return <AlignLeft size={18} {...STROKE} aria-hidden="true" />;
}

export function HeadingBlockIcon() {
  return <Heading size={16} {...STROKE} aria-hidden="true" />;
}

export function ParagraphBlockIcon() {
  return <AlignLeft size={16} {...STROKE} aria-hidden="true" />;
}

export function ListBlockIcon() {
  return <List size={16} {...STROKE} aria-hidden="true" />;
}

export function LinkBlockIcon() {
  return <Link size={16} {...STROKE} aria-hidden="true" />;
}

export function ButtonBlockIcon() {
  return <MousePointerClick size={16} {...STROKE} aria-hidden="true" />;
}

export function NavBlockIcon() {
  return <Menu size={16} {...STROKE} aria-hidden="true" />;
}

export function LabelBlockIcon() {
  return <Tag size={16} {...STROKE} aria-hidden="true" />;
}

export function PlaceholderBlockIcon() {
  return <TextCursorInput size={16} {...STROKE} aria-hidden="true" />;
}

export function TableBlockIcon() {
  return <Table2 size={16} {...STROKE} aria-hidden="true" />;
}

export function AriaBlockIcon() {
  return <Accessibility size={16} {...STROKE} aria-hidden="true" />;
}

export function AssetsIcon() {
  return <ImageIcon size={18} {...STROKE} aria-hidden="true" />;
}

export function ProfileIcon() {
  return <User size={18} {...STROKE} aria-hidden="true" />;
}

export function DownloadIcon() {
  return <Download size={14} {...STROKE} aria-hidden="true" />;
}

export function CopyIcon() {
  return <Copy size={14} {...STROKE} aria-hidden="true" />;
}

export function InspectIcon() {
  return <Crosshair size={14} {...STROKE} aria-hidden="true" />;
}

export function GridViewIcon() {
  return <LayoutGrid size={14} {...STROKE} aria-hidden="true" />;
}

export function ListViewIcon() {
  return <List size={14} {...STROKE} aria-hidden="true" />;
}
