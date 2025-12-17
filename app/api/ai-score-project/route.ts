import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { AI_SCORING_SYSTEM_PROMPT, AI_SCORING_USER_PROMPT } from '@/lib/prompts';

interface EvaluationResult {
  project_name: string;
  engagement_score: number;
  methodology_score: number;
  inclusivity_score: number;
  patient_impact_score: number;
  business_value_score: number;
  system_value_score: number;
  sustainability_score: number;
  engagement_reasoning: string;
  methodology_reasoning: string;
  inclusivity_reasoning: string;
  patient_impact_reasoning: string;
  business_value_reasoning: string;
  system_value_reasoning: string;
  sustainability_reasoning: string;
  strengths: string[];
  improvements: string[];
  average_score?: number;
  final_percentage_score?: number;
}

// Calculate final percentage score based on the 7 criteria scores
// Matches the Python implementation in scoring_agent.py
function calculateFinalScore(evaluation: EvaluationResult): number {
  const scores = [
    evaluation.engagement_score || 0,
    evaluation.methodology_score || 0,
    evaluation.inclusivity_score || 0,
    evaluation.patient_impact_score || 0,
    evaluation.business_value_score || 0,
    evaluation.system_value_score || 0,
    evaluation.sustainability_score || 0
  ];
  
  // Calculate average score (0-4 scale)
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  // Piecewise linear mapping to [60-100] range
  let finalScore: number;
  
  if (avgScore <= 1) {
    finalScore = 60;
  } else if (avgScore <= 1.5) {
    finalScore = 60 + ((avgScore - 1) * 10);
  } else if (avgScore <= 2) {
    finalScore = 65 + ((avgScore - 1.5) * 10);
  } else if (avgScore <= 2.5) {
    finalScore = 70 + ((avgScore - 2) * 10);
  } else if (avgScore <= 3) {
    finalScore = 75 + ((avgScore - 2.5) * 20);
  } else if (avgScore <= 3.5) {
    finalScore = 85 + ((avgScore - 3) * 10);
  } else {
    finalScore = 90 + ((avgScore - 3.5) * 20);
  }
  
  // Ensure within [60-100] range
  return Math.max(60, Math.min(100, Math.round(finalScore * 100) / 100));
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { projectId, registrationId, extractedText } = await request.json();

    // Support both projectId (legacy) and registrationId (new)
    const targetId = registrationId || projectId;
    const isRegistration = !!registrationId;

    if (!targetId || !extractedText) {
      return NextResponse.json({ 
        error: 'Missing required fields: registrationId (or projectId) and extractedText' 
      }, { status: 400 });
    }

    // Validate text length
    if (extractedText.length < 100) {
      return NextResponse.json({ 
        error: 'Extracted text is too short for evaluation' 
      }, { status: 400 });
    }

    console.log(`[AI Scoring] Evaluating ${isRegistration ? 'registration' : 'project'} ID ${targetId}, text length: ${extractedText.length} chars`);

    // Generate AI evaluation using OpenAI
    const result = await generateText({
      model: openai('gpt-4o-2024-08-06', {
        structuredOutputs: true,
      }),
      system: AI_SCORING_SYSTEM_PROMPT,
      prompt: AI_SCORING_USER_PROMPT(extractedText),
      maxTokens: 4000,
      temperature: 0.3,
    });

    console.log('[AI Scoring] Raw AI response received');

    // Parse the response
    let evaluation: EvaluationResult;
    try {
      // Try to parse as JSON
      const cleanedResponse = result.text.trim()
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      evaluation = JSON.parse(cleanedResponse);
      console.log('[AI Scoring] Successfully parsed evaluation JSON');
    } catch (parseError) {
      console.error('[AI Scoring] Failed to parse AI response:', parseError);
      console.error('[AI Scoring] Raw response:', result.text);
      return NextResponse.json({ 
        error: 'Failed to parse AI evaluation response',
        details: parseError instanceof Error ? parseError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Calculate derived scores
    const scores = [
      evaluation.engagement_score || 0,
      evaluation.methodology_score || 0,
      evaluation.inclusivity_score || 0,
      evaluation.patient_impact_score || 0,
      evaluation.business_value_score || 0,
      evaluation.system_value_score || 0,
      evaluation.sustainability_score || 0
    ];
    
    evaluation.average_score = Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100;
    evaluation.final_percentage_score = calculateFinalScore(evaluation);

    console.log(`[AI Scoring] Calculated average: ${evaluation.average_score}, final: ${evaluation.final_percentage_score}`);

    // Store evaluation in database (use appropriate table based on type)
    const tableName = isRegistration ? 'ai_registration_scores' : 'ai_project_scores';
    const idField = isRegistration ? 'registration_id' : 'project_id';
    
    const { error: insertError } = await supabase
      .from(tableName)
      .upsert({
        [idField]: targetId,
        engagement_score: evaluation.engagement_score,
        methodology_score: evaluation.methodology_score,
        inclusivity_score: evaluation.inclusivity_score,
        patient_impact_score: evaluation.patient_impact_score,
        business_value_score: evaluation.business_value_score,
        system_value_score: evaluation.system_value_score,
        sustainability_score: evaluation.sustainability_score,
        engagement_reasoning: evaluation.engagement_reasoning,
        methodology_reasoning: evaluation.methodology_reasoning,
        inclusivity_reasoning: evaluation.inclusivity_reasoning,
        patient_impact_reasoning: evaluation.patient_impact_reasoning,
        business_value_reasoning: evaluation.business_value_reasoning,
        system_value_reasoning: evaluation.system_value_reasoning,
        sustainability_reasoning: evaluation.sustainability_reasoning,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        average_score: evaluation.average_score,
        final_percentage_score: evaluation.final_percentage_score,
        evaluated_at: new Date().toISOString(),
      }, {
        onConflict: idField
      });

    if (insertError) {
      console.error('[AI Scoring] Database error:', insertError);
      return NextResponse.json({ 
        error: 'Failed to store evaluation',
        details: insertError.message
      }, { status: 500 });
    }

    console.log(`[AI Scoring] Successfully stored evaluation for ${isRegistration ? 'registration' : 'project'} ${targetId}`);

    return NextResponse.json({ 
      success: true,
      evaluation 
    });

  } catch (error) {
    console.error('[AI Scoring] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
