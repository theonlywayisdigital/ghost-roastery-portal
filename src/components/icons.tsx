/**
 * Icon wrapper — re-exports Phosphor Icons (duotone weight) using the same
 * names as the lucide-react icons we're replacing. This keeps the migration
 * diff minimal: each file just changes `from "lucide-react"` →
 * `from "@/components/icons"`.
 *
 * Phosphor duotone weight renders two layers at different opacities,
 * giving a branded two-tone look when you set `color` to the brand colour.
 *
 * Icons: https://phosphoricons.com — MIT licence, no attribution required.
 */
"use client";

import type { ComponentType } from "react";
import { forwardRef } from "react";
import type { IconProps as PhosphorIconProps } from "@phosphor-icons/react";
import {
  WarningCircle as _WarningCircle,
  Warning as _Warning,
  TextAlignCenter as _AlignCenter,
  TextAlignLeft as _AlignLeft,
  TextAlignRight as _AlignRight,
  ArrowDown as _ArrowDown,
  ArrowLeft as _ArrowLeft,
  ArrowRight as _ArrowRight,
  ArrowUp as _ArrowUp,
  ArrowsDownUp as _ArrowsDownUp,
  ChartBar as _ChartBar,
  Bell as _Bell,
  BookOpen as _BookOpen,
  Robot as _Robot,
  BuildingOffice as _BuildingOffice,
  Calendar as _Calendar,
  Check as _Check,
  CheckCircle as _CheckCircle,
  CaretDown as _CaretDown,
  CaretLeft as _CaretLeft,
  CaretRight as _CaretRight,
  CaretUp as _CaretUp,
  ClipboardText as _ClipboardText,
  Clock as _Clock,
  Code as _Code,
  Coffee as _Coffee,
  Copy as _Copy,
  CreditCard as _CreditCard,
  Download as _Download,
  ArrowSquareOut as _ArrowSquareOut,
  Eye as _Eye,
  EyeSlash as _EyeSlash,
  FacebookLogo as _FacebookLogo,
  NotePencil as _NotePencil,
  FileText as _FileText,
  FilmStrip as _FilmStrip,
  Globe as _Globe,
  Image as _Image,
  InstagramLogo as _InstagramLogo,
  Stack as _Stack,
  Layout as _Layout,
  Lifebuoy as _Lifebuoy,
  CircleNotch as _CircleNotch,
  Lock as _Lock,
  Envelope as _Envelope,
  MapPin as _MapPin,
  Megaphone as _Megaphone,
  List as _List,
  ChatCircle as _ChatCircle,
  Minus as _Minus,
  Monitor as _Monitor,
  Package as _Package,
  Palette as _Palette,
  Pencil as _Pencil,
  Plus as _Plus,
  Printer as _Printer,
  ArrowClockwise as _ArrowClockwise,
  ArrowCounterClockwise as _ArrowCounterClockwise,
  FloppyDisk as _FloppyDisk,
  Scroll as _Scroll,
  MagnifyingGlass as _MagnifyingGlass,
  PaperPlaneTilt as _PaperPlaneTilt,
  Gear as _Gear,
  ShareNetwork as _ShareNetwork,
  ShieldCheck as _ShieldCheck,
  Bag as _Bag,
  ShoppingCart as _ShoppingCart,
  SlidersHorizontal as _SlidersHorizontal,
  DeviceMobile as _DeviceMobile,
  Sparkle as _Sparkle,
  Storefront as _Storefront,
  DeviceTablet as _DeviceTablet,
  Tag as _Tag,
  Ticket as _Ticket,
  Trash as _Trash,
  TrendUp as _TrendUp,
  Truck as _Truck,
  Upload as _Upload,
  User as _User,
  UserCircle as _UserCircle,
  UserPlus as _UserPlus,
  Users as _Users,
  Wallet as _Wallet,
  X as _X,
  XCircle as _XCircle,
  Lightning as _Lightning,
  CalendarDots as _CalendarDots,
  PaperPlaneRight as _PaperPlaneRight,
  ShareFat as _ShareFat,
  Receipt as _Receipt,
  CurrencyGbp as _CurrencyGbp,
  SignOut as _SignOut,
  Link as _Link,
  // ── Additional icons found in codebase ──
  Pulse as _Activity,
  Archive as _Archive,
  ArrowDownLeft as _ArrowDownLeft,
  ArrowUpRight as _ArrowUpRight,
  Prohibit as _Prohibit,
  TextB as _TextB,
  Buildings as _Buildings,
  Camera as _Camera,
  Checks as _Checks,
  CheckSquare as _CheckSquare,
  Circle as _Circle,
  Columns as _Columns,
  Crown as _Crown,
  CurrencyDollar as _CurrencyDollar,
  PencilSimple as _PencilSimple,
  Funnel as _Funnel,
  Fire as _Fire,
  Images as _Images,
  Gift as _Gift,
  GitBranch as _GitBranch,
  DotsSixVertical as _DotsSixVertical,
  Handshake as _Handshake,
  Hash as _Hash,
  TextH as _TextH,
  Heart as _Heart,
  Question as _Question,
  ClockCounterClockwise as _ClockHistory,
  Tray as _Tray,
  Info as _Info,
  TextItalic as _TextItalic,
  Key as _Key,
  Bank as _Bank,
  SquaresFour as _SquaresFour,
  Lightbulb as _Lightbulb,
  LinkSimple as _LinkSimple,
  ListBullets as _ListBullets,
  ListNumbers as _ListNumbers,
  EnvelopeOpen as _EnvelopeOpen,
  ChatCircleDots as _ChatCircleDots,
  DotsThree as _DotsThree,
  CursorClick as _CursorClick,
  Newspaper as _Newspaper,
  PaintBrush as _PaintBrush,
  Rows as _Rows,
  Confetti as _Confetti,
  Pause as _Pause,
  Percent as _Percent,
  Phone as _Phone,
  Play as _Play,
  Power as _Power,
  Quotes as _Quotes,
  ArrowsClockwise as _ArrowsClockwise,
  RocketLaunch as _RocketLaunch,
  Shield as _Shield,
  ShieldSlash as _ShieldSlash,
  Shuffle as _Shuffle,
  TextAa as _TextAa,
  Star as _Star,
  Note as _Note,
  TestTube as _TestTube,
  ThumbsDown as _ThumbsDown,
  ThumbsUp as _ThumbsUp,
  TextUnderline as _TextUnderline,
  PlugsConnected as _PlugsConnected,
  UserCheck as _UserCheck,
  UserGear as _UserGear,
  UserMinus as _UserMinus,
  VideoCamera as _VideoCamera,
  WebhooksLogo as _WebhooksLogo,
  Placeholder as _Placeholder,
  Thermometer as _Thermometer,
  Scales as _Scales,
  Timer as _Timer,
} from "@phosphor-icons/react";

// ── Wrapper ──

/**
 * Wraps a Phosphor icon component so it:
 * 1. Defaults to `weight="duotone"` for the two-tone brand look
 * 2. Derives `size` from the Tailwind `className` (e.g. "w-5 h-5" → 20)
 * 3. Accepts the same `className` prop lucide-react uses
 */
function wrapIcon(PhosphorIcon: ComponentType<PhosphorIconProps>, displayName: string) {
  const Wrapped = forwardRef<SVGSVGElement, { className?: string; size?: number | string; color?: string; strokeWidth?: number }>(
    function WrappedIcon({ className, size, color, strokeWidth: _sw, ...rest }, ref) {
      // Parse Tailwind w-N / h-N classes to derive pixel size
      let derivedSize: number | string | undefined = size;
      if (!derivedSize && className) {
        const match = className.match(/(?:^|\s)(?:w|h)-(\d+(?:\.\d+)?)/);
        if (match) {
          derivedSize = parseFloat(match[1]) * 4; // Tailwind spacing scale: 1 unit = 4px
        }
      }

      return (
        <PhosphorIcon
          ref={ref}
          size={derivedSize || 24}
          color={color}
          weight="duotone"
          className={className}
          {...rest}
        />
      );
    }
  );
  Wrapped.displayName = displayName;
  return Wrapped;
}

// ── Lucide-compatible exports ──
// Each export matches the lucide-react import name used in the codebase.

export const AlertCircle = wrapIcon(_WarningCircle, "AlertCircle");
export const AlertTriangle = wrapIcon(_Warning, "AlertTriangle");
export const AlignCenter = wrapIcon(_AlignCenter, "AlignCenter");
export const AlignLeft = wrapIcon(_AlignLeft, "AlignLeft");
export const AlignRight = wrapIcon(_AlignRight, "AlignRight");
export const ArrowDown = wrapIcon(_ArrowDown, "ArrowDown");
export const ArrowLeft = wrapIcon(_ArrowLeft, "ArrowLeft");
export const ArrowRight = wrapIcon(_ArrowRight, "ArrowRight");
export const ArrowUp = wrapIcon(_ArrowUp, "ArrowUp");
export const ArrowUpDown = wrapIcon(_ArrowsDownUp, "ArrowUpDown");
export const BarChart3 = wrapIcon(_ChartBar, "BarChart3");
export const Bell = wrapIcon(_Bell, "Bell");
export const BookOpen = wrapIcon(_BookOpen, "BookOpen");
export const Bot = wrapIcon(_Robot, "Bot");
export const Building2 = wrapIcon(_BuildingOffice, "Building2");
export const Calendar = wrapIcon(_Calendar, "Calendar");
export const CalendarDays = wrapIcon(_CalendarDots, "CalendarDays");
export const Check = wrapIcon(_Check, "Check");
export const CheckCircle = wrapIcon(_CheckCircle, "CheckCircle");
export const CheckCircle2 = wrapIcon(_CheckCircle, "CheckCircle2");
export const ChevronDown = wrapIcon(_CaretDown, "ChevronDown");
export const ChevronLeft = wrapIcon(_CaretLeft, "ChevronLeft");
export const ChevronRight = wrapIcon(_CaretRight, "ChevronRight");
export const ChevronUp = wrapIcon(_CaretUp, "ChevronUp");
export const ClipboardList = wrapIcon(_ClipboardText, "ClipboardList");
export const Clock = wrapIcon(_Clock, "Clock");
export const Code = wrapIcon(_Code, "Code");
export const Coffee = wrapIcon(_Coffee, "Coffee");
export const Copy = wrapIcon(_Copy, "Copy");
export const CreditCard = wrapIcon(_CreditCard, "CreditCard");
export const Download = wrapIcon(_Download, "Download");
export const ExternalLink = wrapIcon(_ArrowSquareOut, "ExternalLink");
export const Eye = wrapIcon(_Eye, "Eye");
export const EyeOff = wrapIcon(_EyeSlash, "EyeOff");
export const Facebook = wrapIcon(_FacebookLogo, "Facebook");
export const FileEdit = wrapIcon(_NotePencil, "FileEdit");
export const FileText = wrapIcon(_FileText, "FileText");
export const Film = wrapIcon(_FilmStrip, "Film");
export const Globe = wrapIcon(_Globe, "Globe");
export const ImageIcon = wrapIcon(_Image, "ImageIcon");
export const Instagram = wrapIcon(_InstagramLogo, "Instagram");
export const Layers = wrapIcon(_Stack, "Layers");
export const Layout = wrapIcon(_Layout, "Layout");
export const LayoutIcon = Layout;
export const LifeBuoy = wrapIcon(_Lifebuoy, "LifeBuoy");
export const Loader2 = wrapIcon(_CircleNotch, "Loader2");
export const Lock = wrapIcon(_Lock, "Lock");
export const LogOut = wrapIcon(_SignOut, "LogOut");
export const Mail = wrapIcon(_Envelope, "Mail");
export const MapPin = wrapIcon(_MapPin, "MapPin");
export const Megaphone = wrapIcon(_Megaphone, "Megaphone");
export const Menu = wrapIcon(_List, "Menu");
export const MessageSquare = wrapIcon(_ChatCircle, "MessageSquare");
export const Minus = wrapIcon(_Minus, "Minus");
export const Monitor = wrapIcon(_Monitor, "Monitor");
export const Package = wrapIcon(_Package, "Package");
export const Palette = wrapIcon(_Palette, "Palette");
export const Pencil = wrapIcon(_Pencil, "Pencil");
export const Plus = wrapIcon(_Plus, "Plus");
export const PoundSterling = wrapIcon(_CurrencyGbp, "PoundSterling");
export const Printer = wrapIcon(_Printer, "Printer");
export const Receipt = wrapIcon(_Receipt, "Receipt");
export const Redo2 = wrapIcon(_ArrowClockwise, "Redo2");
export const RotateCcw = wrapIcon(_ArrowCounterClockwise, "RotateCcw");
export const Save = wrapIcon(_FloppyDisk, "Save");
export const ScrollText = wrapIcon(_Scroll, "ScrollText");
export const Search = wrapIcon(_MagnifyingGlass, "Search");
export const Send = wrapIcon(_PaperPlaneTilt, "Send");
export const Settings = wrapIcon(_Gear, "Settings");
export const Settings2 = wrapIcon(_Gear, "Settings2");
export const Share2 = wrapIcon(_ShareNetwork, "Share2");
export const ShieldCheck = wrapIcon(_ShieldCheck, "ShieldCheck");
export const ShoppingBag = wrapIcon(_Bag, "ShoppingBag");
export const ShoppingCart = wrapIcon(_ShoppingCart, "ShoppingCart");
export const Sliders = wrapIcon(_SlidersHorizontal, "Sliders");
export const Smartphone = wrapIcon(_DeviceMobile, "Smartphone");
export const Sparkles = wrapIcon(_Sparkle, "Sparkles");
export const Store = wrapIcon(_Storefront, "Store");
export const Tablet = wrapIcon(_DeviceTablet, "Tablet");
export const Tag = wrapIcon(_Tag, "Tag");
export const Ticket = wrapIcon(_Ticket, "Ticket");
export const Trash2 = wrapIcon(_Trash, "Trash2");
export const TrendingUp = wrapIcon(_TrendUp, "TrendingUp");
export const Truck = wrapIcon(_Truck, "Truck");
export const Undo2 = wrapIcon(_ArrowCounterClockwise, "Undo2");
export const Upload = wrapIcon(_Upload, "Upload");
export const User = wrapIcon(_User, "User");
export const UserCircle = wrapIcon(_UserCircle, "UserCircle");
export const UserPlus = wrapIcon(_UserPlus, "UserPlus");
export const Users = wrapIcon(_Users, "Users");
export const Wallet = wrapIcon(_Wallet, "Wallet");
export const X = wrapIcon(_X, "X");
export const XCircle = wrapIcon(_XCircle, "XCircle");
export const Zap = wrapIcon(_Lightning, "Zap");
export const Link2 = wrapIcon(_Link, "Link2");
export const Contact = wrapIcon(_User, "Contact");
export const Sparkle = wrapIcon(_Sparkle, "Sparkle");

// ── Additional icons ──
export const Activity = wrapIcon(_Activity, "Activity");
export const Archive = wrapIcon(_Archive, "Archive");
export const ArrowDownLeft = wrapIcon(_ArrowDownLeft, "ArrowDownLeft");
export const ArrowUpRight = wrapIcon(_ArrowUpRight, "ArrowUpRight");
export const Ban = wrapIcon(_Prohibit, "Ban");
export const Bold = wrapIcon(_TextB, "Bold");
export const Building = wrapIcon(_Buildings, "Building");
export const Camera = wrapIcon(_Camera, "Camera");
export const CheckCheck = wrapIcon(_Checks, "CheckCheck");
export const CheckSquare = wrapIcon(_CheckSquare, "CheckSquare");
export const Circle = wrapIcon(_Circle, "Circle");
export const Columns2 = wrapIcon(_Columns, "Columns2");
export const Crown = wrapIcon(_Crown, "Crown");
export const DollarSign = wrapIcon(_CurrencyDollar, "DollarSign");
export const Edit2 = wrapIcon(_PencilSimple, "Edit2");
export const Edit3 = wrapIcon(_PencilSimple, "Edit3");
export const Filter = wrapIcon(_Funnel, "Filter");
export const Funnel = wrapIcon(_Funnel, "Funnel");
export const Flame = wrapIcon(_Fire, "Flame");
export const GalleryHorizontalEnd = wrapIcon(_Images, "GalleryHorizontalEnd");
export const Gift = wrapIcon(_Gift, "Gift");
export const GitBranch = wrapIcon(_GitBranch, "GitBranch");
export const GripVertical = wrapIcon(_DotsSixVertical, "GripVertical");
export const Handshake = wrapIcon(_Handshake, "Handshake");
export const Hash = wrapIcon(_Hash, "Hash");
export const Heading = wrapIcon(_TextH, "Heading");
export const Heart = wrapIcon(_Heart, "Heart");
export const HelpCircle = wrapIcon(_Question, "HelpCircle");
export const History = wrapIcon(_ClockHistory, "History");
export const Image = wrapIcon(_Image, "Image");
export const Inbox = wrapIcon(_Tray, "Inbox");
export const Info = wrapIcon(_Info, "Info");
export const Italic = wrapIcon(_TextItalic, "Italic");
export const Key = wrapIcon(_Key, "Key");
export const Landmark = wrapIcon(_Bank, "Landmark");
export const LayoutDashboard = wrapIcon(_SquaresFour, "LayoutDashboard");
export const LayoutGrid = wrapIcon(_SquaresFour, "LayoutGrid");
export const LayoutTemplate = wrapIcon(_Layout, "LayoutTemplate");
export const Lightbulb = wrapIcon(_Lightbulb, "Lightbulb");
export const Link = wrapIcon(_LinkSimple, "Link");
export const List = wrapIcon(_ListBullets, "List");
export const ListOrdered = wrapIcon(_ListNumbers, "ListOrdered");
export const MailOpen = wrapIcon(_EnvelopeOpen, "MailOpen");
export const MessageCircle = wrapIcon(_ChatCircleDots, "MessageCircle");
export const MoreHorizontal = wrapIcon(_DotsThree, "MoreHorizontal");
export const MousePointerClick = wrapIcon(_CursorClick, "MousePointerClick");
export const Newspaper = wrapIcon(_Newspaper, "Newspaper");
export const PackageCheck = wrapIcon(_Package, "PackageCheck");
export const Paintbrush = wrapIcon(_PaintBrush, "Paintbrush");
export const PanelTop = wrapIcon(_Rows, "PanelTop");
export const PartyPopper = wrapIcon(_Confetti, "PartyPopper");
export const Pause = wrapIcon(_Pause, "Pause");
export const Percent = wrapIcon(_Percent, "Percent");
export const Phone = wrapIcon(_Phone, "Phone");
export const Play = wrapIcon(_Play, "Play");
export const Power = wrapIcon(_Power, "Power");
export const Quote = wrapIcon(_Quotes, "Quote");
export const RefreshCw = wrapIcon(_ArrowsClockwise, "RefreshCw");
export const Rocket = wrapIcon(_RocketLaunch, "Rocket");
export const Share = wrapIcon(_ShareFat, "Share");
export const Shield = wrapIcon(_Shield, "Shield");
export const ShieldOff = wrapIcon(_ShieldSlash, "ShieldOff");
export const Shuffle = wrapIcon(_Shuffle, "Shuffle");
export const Space = wrapIcon(_Placeholder, "Space");
export const Star = wrapIcon(_Star, "Star");
export const StickyNote = wrapIcon(_Note, "StickyNote");
export const TestTube = wrapIcon(_TestTube, "TestTube");
export const ThumbsDown = wrapIcon(_ThumbsDown, "ThumbsDown");
export const ThumbsUp = wrapIcon(_ThumbsUp, "ThumbsUp");
export const Type = wrapIcon(_TextAa, "Type");
export const Underline = wrapIcon(_TextUnderline, "Underline");
export const Unplug = wrapIcon(_PlugsConnected, "Unplug");
export const UserCheck = wrapIcon(_UserCheck, "UserCheck");
export const UserCog = wrapIcon(_UserGear, "UserCog");
export const UserMinus = wrapIcon(_UserMinus, "UserMinus");
export const UserX = wrapIcon(_UserMinus, "UserX");
export const Video = wrapIcon(_VideoCamera, "Video");
export const Webhook = wrapIcon(_WebhooksLogo, "Webhook");

// ── Roaster Tools icons ──
export const Thermometer = wrapIcon(_Thermometer, "Thermometer");
export const Scale = wrapIcon(_Scales, "Scale");
export const Timer = wrapIcon(_Timer, "Timer");
