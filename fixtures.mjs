export const cases = [
  {
    id: 'harbor-proposal',
    title: 'Community gallery proposal',
    subtitle: 'A submission window confirmed by a recorded human decision',
    sources: [
      {
        id: 'gallery-call',
        title: 'Gallery call for proposals',
        label: 'Original call · 02 Feb 2027',
        lines: [
          { id: 'gallery-call-l1', text: 'Applications open on 2 February 2027.' },
          { id: 'gallery-call-l2', text: 'Send the final proposal by 18 February 2027 (17:00), local time.' },
          { id: 'gallery-call-l3', text: 'Rehearsals start on 23 February 2027.' },
        ],
      },
      {
        id: 'gallery-review',
        title: 'Coordinator review note',
        label: 'Human review record · 04 Feb 2027',
        lines: [
          { id: 'gallery-review-l1', text: 'Reviewed the gallery call. Confirmed proposal deadline: 18 February 2027 at 17:00.' },
          { id: 'gallery-review-l2', text: 'The rehearsal start is a separate milestone, not the filing deadline.' },
        ],
      },
    ],
    stages: [
      {
        id: 'gallery-arrival', kind: 'source', at: '2027-02-02', label: 'Call received',
        title: 'The invitation distinguishes three dates',
        detail: 'The invitation gives an opening date, a proposal deadline and a rehearsal date.',
        lines: ['gallery-call-l1', 'gallery-call-l2', 'gallery-call-l3'],
      },
      {
        id: 'gallery-candidate', kind: 'candidate', at: '2027-02-03', label: 'Candidate found',
        title: '18 February 2027 at 17:00',
        detail: 'The candidate time comes from the final proposal instruction. It stays provisional until human review.',
        lines: ['gallery-call-l2'],
      },
      {
        id: 'gallery-confirmed', kind: 'confirmed', at: '2027-02-04', label: 'Confirmed',
        title: 'Filing deadline confirmed',
        detail: 'The review independently records the same filing time. Trace the decision to its review note and the source it confirmed.',
        lines: ['gallery-call-l2', 'gallery-review-l1', 'gallery-review-l2'],
      },
    ],
  },
  {
    id: 'studio-access',
    title: 'Studio access application',
    subtitle: 'Conflicting due dates stay visible until someone reconciles them',
    sources: [
      {
        id: 'studio-guide',
        title: 'Studio access guide',
        label: 'Published guide · 12 Feb 2027',
        lines: [
          { id: 'studio-guide-l1', text: 'Studio access opens to residents in March 2027.' },
          { id: 'studio-guide-l2', text: 'The access form must reach the desk by 2 March 2027 at 12:00.' },
        ],
      },
      {
        id: 'studio-brief',
        title: 'Studio application handout',
        label: 'Printed allocation sheet · 14 Feb 2027',
        lines: [
          { id: 'studio-brief-l1', text: 'Studio access applications close on 5 March 2027 at 12:00.' },
          { id: 'studio-brief-l2', text: 'The desk will release its decision on 12 March 2027.' },
        ],
      },
    ],
    stages: [
      {
        id: 'studio-arrival', kind: 'source', at: '2027-02-12', label: 'First source',
        title: 'The published guide gives an application cut-off',
        detail: 'The guide names 2 March 2027 at 12:00 as the deadline for the access form.',
        lines: ['studio-guide-l2'],
      },
      {
        id: 'studio-conflict', kind: 'conflict', at: '2027-02-14', label: 'Dates disagree',
        title: '2 March and 5 March both claim to close applications',
        detail: 'The handout names a different filing cut-off. There is no evidence that either source supersedes the other.',
        lines: ['studio-guide-l2', 'studio-brief-l1'],
      },
      {
        id: 'studio-pending', kind: 'review', at: '2027-02-15', label: 'Needs review',
        title: 'Ask the studio desk to confirm the deadline',
        detail: 'Keep both sources attached. Only an explicit confirmation can resolve the conflict.',
        lines: ['studio-guide-l2', 'studio-brief-l1'],
      },
    ],
  },
  {
    id: 'workshop-brief',
    title: 'Workshop safety brief',
    subtitle: 'An event start date cannot fill a missing submission deadline',
    sources: [
      {
        id: 'workshop-invitation',
        title: 'Workshop invitation',
        label: 'Event notice · 22 Feb 2027',
        lines: [
          { id: 'workshop-l1', text: 'The build workshop starts on 22 March 2027.' },
          { id: 'workshop-l2', text: 'Bring protective glasses to the optional orientation on 20 March.' },
          { id: 'workshop-l3', text: 'Send your safety method statement to the workshop desk for review.' },
        ],
      },
    ],
    stages: [
      {
        id: 'workshop-arrival', kind: 'source', at: '2027-02-22', label: 'Invitation received',
        title: 'A submission is requested',
        detail: 'The invitation asks for a safety method statement. It specifies when the workshop and orientation take place.',
        lines: ['workshop-l1', 'workshop-l2', 'workshop-l3'],
      },
      {
        id: 'workshop-missing', kind: 'missing', at: '2027-02-23', label: 'Deadline absent',
        title: 'No due date is stated',
        detail: 'The source gives two event dates but supplies no deadline for the statement. Leave the deadline unset.',
        lines: ['workshop-l1', 'workshop-l2', 'workshop-l3'],
      },
      {
        id: 'workshop-pending', kind: 'review', at: '2027-02-24', label: 'Needs review',
        title: 'Ask when the statement must arrive',
        detail: 'A confirmation from the workshop desk is needed before a filing deadline can be recorded.',
        lines: ['workshop-l3'],
      },
    ],
  },
];
