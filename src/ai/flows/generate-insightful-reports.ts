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
      'The type of report to generate (admissions, student demographics, financial data, academic progress)'
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
  reportFormat: z.string().describe('The format of the report (e.g., text, CSV, chart).'),
});

export type GenerateInsightfulReportsOutput = z.infer<
  typeof GenerateInsightfulReportsOutputSchema
>;

export async function generateInsightfulReports(
  input: GenerateInsightfulReportsInput
): Promise<GenerateInsightfulReportsOutput> {
  return generateInsightfulReportsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInsightfulReportsPrompt',
  input: {schema: GenerateInsightfulReportsInputSchema},
  output: {schema: GenerateInsightfulReportsOutputSchema},
  prompt: `You are an AI assistant specialized in generating insightful reports based on provided data.

You will generate a report based on the report type specified by the user, and any additional instructions provided.
You must also determine the most suitable format for the content requested.  The format should be most suitable for the content, be it text, CSV, or a chart.

Report Type: {{{reportType}}}
Additional Instructions: {{{additionalInstructions}}}

Ensure the report is well-structured, easy to understand, and provides valuable insights.
`,
});

const generateInsightfulReportsFlow = ai.defineFlow(
  {
    name: 'generateInsightfulReportsFlow',
    inputSchema: GenerateInsightfulReportsInputSchema,
    outputSchema: GenerateInsightfulReportsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
