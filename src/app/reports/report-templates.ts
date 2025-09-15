// src/data/report-templates.ts

export const reportTemplates: Record<string, string> = {
    "Admissions": `
  ADMISSIONS REPORT (A4, portrait)
  
  [Cover block – full width, 60 mm high, 15 % K tint]
  Heading 1: “Admissions Report” 24 pt, Calibri Light, 0 % K
  Sub-head: “Cycle 2025/26 – September to August” 11 pt, 45 % K
  
  Section 1 – Key Metrics (3-column, 60 mm deep)
  - Total applications
  - Offers made
  - Acceptances
  - Conversion %
  - Yield %
  
  Section 2 – Trend Chart (full width, 90 mm high)
  Placeholder: “Paste 5-year line chart: Applications vs Acceptances”
  
  Section 3 – Pipeline Table
  Columns: Programme | Applications | Offers | Acceptances | Conversion
  (6–8 rows, alternate rows shaded 5 % K)
  
  Section 4 – Geographical Heat-Map (half width, 85 mm high)
  Placeholder: “Insert UK LAD map, colour gradient = application density”
  
  Section 5 – Notes & Actions
  Bulleted list, 10 pt, 6 mm indent
    `,
  
    "Student Demographics": `
  STUDENT DEMOGRAPHICS REPORT
  
  [Cover block]
  Heading: “Student Demographics Dashboard”
  
  Section 1 – Snapshot Cards (4 equal columns, 30 mm high)
  - Total enrolment
  - Gender split (donut, 50 mm Ø)
  - Age profile (stacked bar)
  - EAL %
  
  Section 2 – Ethnicity Breakdown (full width, horizontal bar, 70 mm high)
  
  Section 3 – Disability & SEN (two-column table, 60 mm deep)
  
  Section 4 – Indices of Deprivation (scatter, 80 mm high)
  
  Section 5 – Data-quality statement (8 pt italic, 5 % K box)
    `,
  
    "Financial Data": `
  FINANCIAL DATA REPORT
  
  [Cover block]
  Heading: “Financial Position – <Year>”
  
  Section 1 – KPI Ribbon (5 equal cards, 25 mm high)
  - Revenue | Surplus/(Deficit) | Cash days | Net assets | Borrowing ratio
  
  Section 2 – Income Pie (left half, 90 mm Ø)
  
  Section 3 – Expenditure Pie (right half, 90 mm Ø)
  
  Section 4 – 5-Year Surplus Trend (full width, 80 mm high)
  
  Section 5 – Balance Sheet Extract (table, 8 columns, 10 pt)
  
  Section 6 – Auditor comment & management action (ruled box, 15 % K tint)
    `,
  
    "Academic Progress": `
  ACADEMIC PROGRESS REPORT
  
  [Cover block]
  Heading: “Academic Progress Analysis”
  
  Section 1 – Value-Added Scorecard (3-column, 35 mm high)
  - KS4 VA | KS5 VA | Apprenticeship achievement
  
  Section 2 – Attainment 8 vs Progress 8 scatter (full width, 85 mm high)
  
  Section 3 – Subject Performance (horizontal bar, 70 mm high)
  
  Section 4 – Retention & Completion (funnel, 60 mm high)
  
  Section 5 – Outlier Students (4 charts @ 45 mm wide each)
  
  Section 6 – Improvement Plan (bulleted, 10 pt, 6 mm indent)
    `,
  
    "Executive Brief": `
  EXECUTIVE BRIEF (max 2 pages)
  
  Page 1
  [Cover block – 70 mm high]
  Heading: “Executive Brief – <Month Year>”
  
  Matrix (2 × 2 grid, each cell 85 × 60 mm)
  - Enrolment vs Target (bullet chart)
  - Financial Health (traffic-light dial)
  - Academic Risk (RAG table, top 5 courses)
  - Staffing Overview (headcount vs vacancy)
  
  Page 2
  Narrative only:
  Heading 2: “Strategic Issues & Recommended Actions” (12 pt, bold)
  Body: 10 pt, 1.15 line spacing, max 550 words
  Footer: “Next review date: <dd/mm/yyyy>”
    `,
  
    "Income and Expenditure": `
  INCOME & EXPENDITURE REPORT
  
  [Cover block]
  Heading: “Income & Expenditure Account”
  
  Section 1 – Executive Table (8 columns)
  - Budget | Actual | Variance | % Var | YTD Budget | YTD Actual | YTD Var | YTD %
  
  Section 2 – Variance Waterfall (full width, 70 mm high)
  
  Section 3 – Pay / Non-Pay Split (stacked area, 80 mm high)
  
  Section 4 – Cost-centre Deep-dive (table, 6 mm rows, shade 5 % K)
  
  Section 5 – Forecast vs Budget (line + column combo, 75 mm high)
  
  Section 6 – Commentary box (ruled, 15 % K tint, min. 100 words)
    `
  };
  
