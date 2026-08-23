import {
  Download,
  Droplet,
  GripVertical,
  Image as ImageIcon,
  LayoutGrid,
  LayoutPanelLeft,
  List,
  MoreVertical,
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

export function AssetsIcon() {
  return <ImageIcon size={18} {...STROKE} aria-hidden="true" />;
}

export function ProfileIcon() {
  return <User size={18} {...STROKE} aria-hidden="true" />;
}

export function DownloadIcon() {
  return <Download size={14} {...STROKE} aria-hidden="true" />;
}

export function GridViewIcon() {
  return <LayoutGrid size={14} {...STROKE} aria-hidden="true" />;
}

export function ListViewIcon() {
  return <List size={14} {...STROKE} aria-hidden="true" />;
}
