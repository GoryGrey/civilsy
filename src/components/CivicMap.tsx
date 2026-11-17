import React, { useState } from 'react';
import {
  MapPin,
  ThumbsUp,
  ArrowRight,
  CheckCircle2,
  Clock,
  Wrench,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { Report311 } from '../types';

interface CivicMapProps {
  reports: Report311[];
  onUpvote: (id: string) => void;
  onOpenReportTracker: () => void;
  communityName: string;
}

const normalizeCategory = (cat: string): string => {
  if (cat === 'Pothole') return 'Roads & Paving';
  if (cat === 'Streetlight') return 'Streetlight & Safety';
  if (cat === 'Drainage') return 'Water & Drainage';
  if (cat === 'Sidewalk Hazard') return 'Sidewalk & Crosswalk';
  if (cat === 'Illegal Dumping' || cat === 'Graffiti') return 'Trash & Property';
  return cat;
};

export const CivicMap: React.FC<CivicMapProps> = ({
  reports,
  onUpvote,
  onOpenReportTracker,
  communityName,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(reports[0]?.id || null);
  const [filterCat, setFilterCat] = useState<string>('All');

  const filterOptions = [
    'All',
    'Roads & Paving',
    'Streetlight & Safety',
    'Water & Drainage',
    'Parks & Trees',
    'Other',
  ];

  const filteredReports = reports.filter((r) => {
    if (filterCat === 'All') return true;
    const norm = normalizeCategory(r.category);
    if (filterCat === 'Other') {
      return ![
        'Roads & Paving',
        'Streetlight & Safety',
        'Water & Drainage',
        'Parks & Trees',
      ].includes(norm);
    }
    return norm === filterCat;
  });

  const selectedReport =
    filteredReports.find((r) => r.id === selectedId) || filteredReports[0] || null;

  const getPinStyle = (status: Report311['status'], isSelected: boolean) => {
    const base = isSelected ? 'scale-125 ring-4 ring-[#116BFF]/30 z-20' : 'hover:scale-110 z-10';
    if (status === 'Resolved') return `bg-emerald-600 text-white ${base}`;
    if (status === 'In Progress') return `bg-[#116BFF] text-white ${base}`;
    if (status === 'Dispatched') return `bg-[#071B42] text-white ${base}`;
    return `bg-amber-600 text-white ${base}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Top Map Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#116BFF]" />
          <span className="text-sm font-bold text-[#071B42]">
            {communityName} Neighborhood Issue Map
          </span>
        </div>
        <button
          onClick={onOpenReportTracker}
          className="text-xs font-semibold text-[#116BFF] hover:text-[#071B42] transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          <span>View all {reports.length} issues</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category Filter Segment */}
      <div className="px-4 py-2 bg-[#F8F7F4] border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
        {filterOptions.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
              filterCat === cat
                ? 'bg-[#071B42] text-white'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-[#071B42]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Interactive Vector Civic Map of Ashtabula Harbor & Town */}
      <div className="relative h-64 w-full bg-[#E8EFF7] overflow-hidden select-none">
        <svg
          viewBox="0 0 800 420"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
          aria-label="Ashtabula Harbor and Neighborhood Map"
        >
          {/* Lake Erie top shoreline */}
          <path
            d="M0,0 L800,0 L800,118 C670,126 575,92 435,112 C340,125 270,152 145,134 C75,123 30,138 0,145 Z"
            fill="#BFDBFE"
          />
          <text x="58" y="64" fill="#1E40AF" fontSize="15" fontWeight="700" opacity="0.65">
            Lake Erie
          </text>

          {/* Landmass & Parks */}
          <rect x="0" y="135" width="800" height="285" fill="#F2F4F1" opacity="0.55" />
          <path
            d="M520,120 C590,115 680,120 755,130 L740,188 L525,180 Z"
            fill="#DCFCE7"
            opacity="0.9"
          />
          <text x="592" y="158" fill="#166534" fontSize="11" fontWeight="600">
            Walnut Beach &amp; Lake Shore
          </text>

          {/* Ashtabula River / Harbor Channel */}
          <path
            d="M295,120 C298,175 280,220 302,275 C322,325 285,375 305,420"
            stroke="#93C5FD"
            strokeWidth="22"
            fill="none"
            strokeLinecap="round"
          />
          <text x="195" y="195" fill="#1D4ED8" fontSize="11" fontWeight="600">
            Ashtabula Harbor
          </text>

          {/* Street Grid Lines */}
          <g stroke="#CBD5E1" strokeWidth="1.5">
            <line x1="0" y1="205" x2="800" y2="205" />
            <line x1="0" y1="265" x2="800" y2="265" />
            <line x1="0" y1="335" x2="800" y2="335" />
            <line x1="160" y1="135" x2="160" y2="420" />
            <line x1="435" y1="115" x2="435" y2="420" />
            <line x1="615" y1="120" x2="615" y2="420" />
          </g>

          {/* Major Corridors */}
          <path d="M110,168 L410,168" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M110,168 L410,168" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x="155" y="160" fill="#334155" fontSize="10" fontWeight="700">
            Bridge St
          </text>

          <path d="M435,125 L435,415" stroke="#FFFFFF" strokeWidth="7" />
          <text x="444" y="245" fill="#334155" fontSize="10" fontWeight="700">
            Lake Ave
          </text>

          <path d="M0,265 L800,265" stroke="#FFFFFF" strokeWidth="6" />
          <text x="530" y="257" fill="#334155" fontSize="10" fontWeight="700">
            US-20 / W 6th St
          </text>

          {/* I-90 Bottom Corridor */}
          <path d="M0,382 Q400,362 800,388" stroke="#64748B" strokeWidth="4" fill="none" />
          <rect x="695" y="366" width="38" height="20" rx="5" fill="#071B42" />
          <text x="714" y="380" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">
            I-90
          </text>

          {/* City Hall Marker */}
          <circle cx="435" cy="252" r="7" fill="#071B42" stroke="#FFFFFF" strokeWidth="2" />
          <text x="448" y="256" fill="#071B42" fontSize="10" fontWeight="700">
            City Hall (4250 Lake Ave)
          </text>
        </svg>

        {/* Live Report Pins */}
        {filteredReports.map((report) => {
          const isSelected = selectedReport?.id === report.id;
          return (
            <button
              key={report.id}
              onClick={() => setSelectedId(report.id)}
              style={{ left: `${report.mapX ?? 48}%`, top: `${report.mapY ?? 52}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-transform cursor-pointer ${getPinStyle(
                report.status,
                isSelected
              )}`}
              title={`${report.category}: ${report.location}`}
            >
              {report.status === 'Resolved' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : report.status === 'In Progress' ? (
                <Wrench className="w-3.5 h-3.5" />
              ) : report.status === 'Dispatched' ? (
                <Clock className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
            </button>
          );
        })}

        {/* Status Legend */}
        <div className="absolute bottom-2.5 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-3 text-[10px] font-semibold text-[#071B42] shadow-sm">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-600" /> Reported
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#071B42]" /> Dispatched
            </span>
            <span className="flex items-center gap-1">
              <Wrench className="w-3 h-3 text-[#116BFF]" /> In Progress
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Resolved
            </span>
          </div>
        </div>
      </div>

      {/* Selected Pin Inspection Bar */}
      {selectedReport ? (
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#071B42]">{selectedReport.category}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedReport.status}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{selectedReport.submittedDate}</span>
            </div>
            <p className="text-sm font-semibold text-[#071B42] truncate mt-0.5">
              {selectedReport.location}
            </p>
            <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
              {selectedReport.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onUpvote(selectedReport.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:border-[#116BFF] hover:text-[#116BFF] text-xs font-semibold text-[#071B42] transition-colors tabular-nums"
              title="Support this report"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{selectedReport.upvotes}</span>
            </button>
            <button
              onClick={onOpenReportTracker}
              className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-lg bg-[#116BFF] hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 text-xs text-slate-500 border-t border-slate-200 flex items-center justify-between">
          <span>No reports match this category filter yet.</span>
          <button
            onClick={onOpenReportTracker}
            className="text-xs font-semibold text-[#116BFF] hover:underline"
          >
            Report an issue
          </button>
        </div>
      )}
    </div>
  );
};
