export type CommunityKind = 'City' | 'Village' | 'Township' | 'County';

export type Community = {
  id: string;
  name: string;
  kind: CommunityKind;
  state: string;
  population: string;
  executiveTitle: string;
  executiveName: string;
  councilType: string;
  cityHallAddress: string;
  councilMeetingSchedule: string;
  activeIssuesCount: number;
  officialPortalUrl: string;
  zipCodes?: string[];
  schoolDistrict?: string;
};

export type DepartmentCategory =
  | 'Streets & Roads'
  | 'Taxes & Spending'
  | 'Schools'
  | 'Neighborhood & Zoning'
  | 'Upcoming Votes';

export type CivicItem = {
  id: string;
  title: string;
  category: 'Meeting' | 'Proposal' | 'Budget' | 'Petition' | 'Zoning' | 'School';
  departmentGroup: DepartmentCategory;
  summary: string;
  fullDescription: string;
  date: string;
  location: string;
  department: string;
  impactLevel: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Voting Soon' | 'In Progress' | 'Passed' | 'Closed';
  progressStage: 1 | 2 | 3 | 4; // 1: Introduced, 2: Committee Review, 3: Public Hearing, 4: Decision / Complete
  costImpact: string;
  whoBenefits: string;
  whoPays: string;
  openQuestions: string[];
  imageUrl?: string;
  sourceLabel: string;
  sourceUrl?: string;
  closingSoonDeadline?: string;
  calendarStartIso?: string;
  calendarDurationMin?: number;
  officialVoteComparison?: {
    resultLabel: string;
    yesCount: number;
    noCount: number;
    abstainCount: number;
    baselineSupportPct: number;
    baselineConcernPct: number;
    note: string;
  };
};

export type ResidentPulse = {
  id: string;
  civicItemId: string;
  userId: string;
  stance: 'Support' | 'Concerned' | 'Question';
  reason?: string;
  updatedAtLabel: string;
};

export type MeetingVoteMember = {
  member: string;
  district: string;
  vote: 'Yes' | 'No' | 'Abstain';
};

export type MeetingVoteItem = {
  motion: string;
  result: 'Passed' | 'Failed' | 'Tabled';
  yesCount: number;
  noCount: number;
  abstainCount: number;
  effectiveWhen: string;
  votes: MeetingVoteMember[];
};

export type MeetingRecap = {
  id: string;
  bodyName: string;
  jurisdictionScope: string;
  dateLabel: string;
  venue: string;
  threeDecisions: string[];
  voteItems: MeetingVoteItem[];
  residentPulseSummary?: {
    supportPct: number;
    finalPassedPct: number;
    summaryNote: string;
  };
  sourceLabel: string;
  sourceUrl: string;
};

export type BallotLevyItem = {
  id: string;
  title: string;
  authority: string;
  scopeKind: 'Countywide' | 'City' | 'Village' | 'Township' | 'School';
  communityIds?: string[];
  schoolKeyword?: string;
  levyType: 'New' | 'Renewal' | 'Replacement' | 'Charter / Issue';
  mills: number;
  term: string;
  electionDate: string;
  yesOutcome: string;
  noOutcome: string;
  sourceLabel: string;
  sourceUrl: string;
};

export type BoardVolunteerOpportunity = {
  id: string;
  title: string;
  communityScope: string;
  communityIds?: string[];
  kind: 'Board Seat' | 'Cleanup & Event' | 'Commission';
  seatsOrNeed: string;
  timeCommitment: string;
  meetingSchedule: string;
  description: string;
  howToApply: string;
  contactEmail: string;
};

export type VolunteerSignup = {
  id: string;
  userId: string;
  opportunityId: string;
  title: string;
  communityName: string;
  kind: 'Board Seat' | 'Cleanup & Event' | 'Commission';
  status: 'Interested' | 'Applied';
  createdAtLabel: string;
};

export type CommunityBenchmark = {
  communityId: string;
  effectiveMills: number;
  schoolPct: number;
  countyPct: number;
  localPct: number;
  otherPct: number;
  median311Days: number;
  openMeetingsPerMonth: number;
  highlightNote: string;
};

export type CivicComment = {
  id: string;
  civicItemId: string;
  authorUid: string;
  authorName: string;
  stance: 'Support' | 'Concern' | 'Question';
  body: string;
  createdAtLabel: string;
  moderationStatus: 'approved' | 'pending_review' | 'flagged' | 'removed';
  moderationNote?: string;
  flagCount: number;
  isOfficialResponse?: boolean;
  officialRole?: string;
};

export type CommentFlag = {
  id: string;
  commentId: string;
  civicItemId: string;
  reporterUid: string;
  reason: 'Harassment' | 'Spam' | 'Private Info' | 'Misleading';
  details?: string;
  createdAtLabel: string;
  status: 'open' | 'reviewed';
};

export type GroundedSource = {
  title: string;
  url: string;
};

export type WatchlistEntry = {
  id: string;
  userId: string;
  itemId: string;
  title: string;
  category: string;
  status: string;
  department: string;
};

export type CivicCartItem = {
  id: string;
  userId?: string;
  civicItemId?: string;
  title: string;
  actionType: 'Attend Meeting' | 'Email Official' | 'Sign Petition' | 'Public Comment' | 'Report Issue';
  targetEntity: string;
  dueDate?: string;
  status: 'Queued' | 'Completed';
};

export type UserAlertPreference = {
  userId: string;
  communityId: string;
  topics: string[];
  emailDigestEnabled: boolean;
  digestEmail?: string;
  updatedAtLabel: string;
};

export type Report311Category =
  | 'Roads & Paving'
  | 'Streetlight & Safety'
  | 'Water & Drainage'
  | 'Parks & Trees'
  | 'Trash & Property'
  | 'Sidewalk & Crosswalk'
  | 'Traffic & Signage'
  | 'Other Local Issue'
  | 'Pothole'
  | 'Streetlight'
  | 'Graffiti'
  | 'Illegal Dumping'
  | 'Sidewalk Hazard'
  | 'Drainage';

export type Report311 = {
  id: string;
  category: Report311Category;
  location: string;
  description: string;
  status: 'Submitted' | 'Dispatched' | 'In Progress' | 'Resolved';
  submittedDate: string;
  upvotes: number;
  reporterName: string;
  authorUid?: string;
  communityId?: string;
  mapX: number; // Percentage 0-100 on civic map
  mapY: number; // Percentage 0-100 on civic map
  photoUrl?: string;
  photoModerationStatus?: 'approved' | 'pending_review' | 'flagged' | 'removed';
  photoModerationNote?: string;
  photoFlagCount?: number;
  afterPhotoUrl?: string;
  resolvedDate?: string;
  resolvedDays?: number;
  officialResponse?: string;
  officialResponderName?: string;
  officialRespondedAt?: string;
};

export type Official = {
  id: string;
  name: string;
  initials: string;
  title: string;
  body: 'City Council' | 'City Administration' | 'School Board' | 'County' | 'Township & Village';
  district: string;
  email: string;
  phone: string;
  officeAddress: string;
  officeHours: string;
  bio: string;
  priorities: string[];
};

export type AcademyModule = {
  id: string;
  title: string;
  category: 'Basics' | 'Rights' | 'Budgeting' | 'Action';
  readTime: string;
  level: 'Beginner' | 'Intermediate';
  summary: string;
  content: string[];
};
