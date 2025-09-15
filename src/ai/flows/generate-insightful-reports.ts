'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating insightful reports on various aspects of student data.
 *
 * It includes functionality for generating reports on admissions, student demographics,
 * financial data, and academic progress. The flow determines the most suitable format
 * for the requested content.
 *
 * @exports generateInsightfulReports - An async function that generates reports based on user input.
 * @exports GenerateInsightfulReportsInput - The input type for the generateInsightfulReports function.
 * @exports GenerateInsightfulReportsOutput - The output type for the generateInsightfulReports function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInsightfulReportsInputSchema = z.object({
  reportType: z
    .string()
    .describe(
      'The type of report to generate (admissions, student demographics, financial data, academic progress, executive brief, income and expenditure)'
    ),
  additionalInstructions: z
    .string()
    .optional()
    .describe('Any specific instructions for generating the report'),
});

export type GenerateInsightfulReportsInput = z.infer<
  typeof GenerateInsightfulReportsInputSchema
>;

const GenerateInsightfulReportsOutputSchema = z.object({
  reportContent: z.string().describe('The generated report content.'),
  reportFormat: z
    .string()
    .describe('The format of the report (e.g., text, CSV, chart).'),
});

export type GenerateInsightfulReportsOutput = z.infer<
  typeof GenerateInsightfulReportsOutputSchema
>;

export async function generateInsightfulReports(
  input: GenerateInsightfulReportsInput
): Promise<GenerateInsightfulReportsOutput> {
  return generateInsightfulReportsFlow(input);
}

const incomeAndExpenditurePrompt = ai.definePrompt({
  name: 'incomeAndExpenditurePrompt',
  input: {schema: GenerateInsightfulReportsInputSchema},
  output: {schema: GenerateInsightfulReportsOutputSchema},
  prompt: `You are an AI assistant specialized in generating insightful reports based on provided data.

Please generate a report using the following "Income and Expenditure Account" template. Use markdown for the report.

# CHARIOT
## EDUCATIONAL COMPLEX
### Income and Expenditure Account
#### (As at 30th June 2025)

| INCOME | GHC | GHC |
|---|---|---|
| Bal B/F (May 2025) | | 124,233.64 |
| Canteen Fee | | 16,630.00 |
| Transport | | 2,481.00 |
| New Admissions School fees | | 1,410.00 |
| Termly School fees (Old Students) & Recovered | | 11,800.00 |
| Books - Sold to Old Students | - | |
| Books - New Admissions | | 410.00 |
| School Uniforms - New Admissions | | 980.00 |
| School Uniforms - Old Students | | 240.00 |
| Extra From Printing and Our-day | - | |
| **TOTAL INCOME** | | **157,484.64** |

| LESS EXPENSES | GHC | GHC |
|---|---|---|
| **Salary (June)** | | **6,400.00** |
| Canteen Food (16/06/25) Food for Stuff - Canteen | | 130.00 |
| Petty Expense | | |
| (02/06/25) Envelopes | 25.00 | |
| (06/06/25) First Aid-items | 32.50 | |
| (13/06/25) 1v1 for pupils | 20.00 | |
| (13/06/25) Refuse | 50.00 | |
| (16/06/25) After Wash | 10.00 | |
| (17/06/25) Prize | 170.00 | |
| (18/06/25) Rubber bag | 10.00 | |
| (18/06/25) Wheel burrow | 20.00 | |
| (25/06/25) Refuse | 50.00 | **387.50** |
| Teacher's Motivation | | |
| (13/06/25) | 242.00 | |
| (20/06/25) | 492.00 | |
| (27/06/25) | 450.00 | **1,184.00** |
| Bus Fuel | | 1,980.00 |
| Bus Maintenance | | 5,807.00 |
| Water Bill / Water Supply | - | |
| Tel. Charges | - | |
`,
});

const executiveBriefPrompt = ai.definePrompt({
  name: 'executiveBriefPrompt',
  input: {schema: GenerateInsightfulReportsInputSchema},
  output: {schema: GenerateInsightfulReportsOutputSchema},
  prompt: `You are an AI assistant specialized in generating insightful reports based on provided data.

Please generate a report using the following "Executive Brief" template. Use markdown for tables.

**CampusFlow Mini–School Executive Brief**
(Condensed to two pages for board & PTA circulation)
School Year 2024/25 • 150 Learners • 15 Staff • 1 Bus • Creche → Primary 5

**📌 Snapshot (as at 05 Sep 2025)**
| Enrolment | Staffing | Finance (YTD Aug) | Transport |
|---|---|---|---|
| 150 learners across 7 grade levels (Creche, Nursery 1–2, KG 1–2, Primary 1–5) | 15 total (9 teachers, 3 assistants, 2 admin, 1 driver) | Revenue: GHS 1.12 M • Surplus: GHS 183 k (16 %) | 1 33-seater bus, 98 % on-time arrival |

**📈 Key Metrics (vs. 2023/24)**
| Admissions | Finance | Academics |
|---|---|---|
| +12 % new intake (17 vs 15) driven by Creche & Primary 1 | Fee collection rate 97 % (up from 93 %) • No arrears > 30 days | Mean grade-point 2.9/4.0 (▲ 0.2) • Zero Primary 5 failures |

**💰 Income & Expenditure (GHS ‘000)**
| Income | Amount | Expenditure | Amount |
|---|---|---|---|
| Tuition & Fees | 1,020 | Staff Salaries & Benefits | 540 |
| Transport Levy | 80 | Learning Materials | 115 |
| Misc. (Uniform, Books) | 20 | Bus Operations & Fuel | 85 |
| Total | 1,120 | Utilities & Maintenance | 97 |
| | | Admin & Audit | 65 |
| | | Depreciation / Reserves | 35 |
| Surplus | 183 | Total | 937 |

**🎯 Immediate Priorities (Next 90 Days)**
1.  **Teacher Up-skilling** – 3-day phonics workshop for KG staff (budget GHS 4 k).
2.  **Bus Replacement Fund** – Seed GHS 25 k into sinking fund; target new 52-seater by 2027.
3.  **Digital Assessment Roll-out** – Deploy tablet-based literacy tests in Primary 3–5 (pilot 40 pupils).
4.  **Safety Audit** – Fire-drill & first-aid refresher before term break.

**📊 Dashboard KPIs**
| KPI | Target | Aug 2025 Actual | Status |
|---|---|---|---|
| Fee collection rate | ≥ 95 % | 97 % | ✅ |
| Average class size | ≤ 25 | 21.4 | ✅ |
| Bus utilization | ≥ 80 % | 91 % | ✅ |
| Teacher : Pupil ratio | ≥ 1 : 12 | 1 : 10 | ✅ |

*Prepared by: Finance & Admin Office*
*Next Review: 30 Nov 2025*
`,
});

const generalReportPrompt = ai.definePrompt({
  name: 'generalReportPrompt',
  input: {schema: GenerateInsightfulReportsInputSchema},
  output: {schema: GenerateInsightfulReportsOutputSchema},
  prompt: `Generate a professionally formatted {{{reportType}}} report with clear headings, sub-sections, and a concise executive summary.

Output Requirements

Structure:

- Title Page (Report Title, Date, Author/Org)
- Executive Summary (150–200 words)
- Key Findings (bullet list with metrics/percentages)
- Detailed Analysis (sub-sections by theme)
- Recommendations (action items)
- Appendix / Data Tables (if needed)

Formatting:

- Use clear H1/H2/H3 headings.
- Bullet lists for key points.
- Tables or simple charts where numeric comparisons help.

Tone: Business-ready, concise, no fluff.

Export: Ensure the layout copies cleanly to Word (.docx) and PDF.

For Excel-bound data, include all tabular info as clean CSV-friendly tables with headers.

You must also determine the most suitable format for the content requested. The format should be most suitable for the content, be it text, CSV, or a chart.

Additional Instructions: {{{additionalInstructions}}}
`,
});

const generateInsightfulReportsFlow = ai.defineFlow(
  {
    name: 'generateInsightfulReportsFlow',
    inputSchema: GenerateInsightfulReportsInputSchema,
    outputSchema: GenerateInsightfulReportsOutputSchema,
  },
  async (input) => {
    if (input.reportType === 'executive brief') {
      const {output} = await executiveBriefPrompt(input);
      // For the executive brief, we know the format is text.
      return {
        reportContent: output!.reportContent,
        reportFormat: 'text',
      };
    } else if (input.reportType === 'income and expenditure') {
      const {output} = await incomeAndExpenditurePrompt(input);
      return {
        reportContent: output!.reportContent,
        reportFormat: 'text',
      };
    } else {
      const {output} = await generalReportPrompt(input);
      return output!;
    }
  }
);
