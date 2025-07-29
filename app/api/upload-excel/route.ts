import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

interface ExcelRow {
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated and is admin
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = sessionData.session.user.email;
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || userEmail !== adminEmail) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Get first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
    
    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ error: 'No data found in Excel file' }, { status: 400 });
    }

    // map excel columns to our database fields
    // updated to match the specific italian column names from the excel file
    const columnMappings = {
      'organization': ['RAGIONE SOCIALE', 'ragione sociale', 'ragione_sociale', 'organization', 'organizzazione'],
      'project_title': ['TITOLO PROGETTO', 'titolo progetto', 'titolo_progetto', 'title', 'titolo'],
      'category': ['CATEGORIA', 'categoria', 'category'],
      'organization_type': ['TIPOLOGIA', 'tipologia', 'tipo', 'organization_type'],
      'therapeutic_area': ['AREA TERAPEUTICA', 'area terapeutica', 'area_terapeutica', 'therapeutic_area'],
      'jury_info': ['INFO GIURIA', 'info giuria', 'info_giuria', 'jury_info'],
      'objectives_results': ['OBIETTIVI RISULTATI', 'obiettivi risultati', 'obiettivi_risultati', 'objectives_results'],
      'presentation_link': ['LINK PRESENTAZIONE', 'link presentazione', 'link_presentazione', 'presentation_link']
    };

    // function to find matching column name
    const findColumn = (row: ExcelRow, possibleNames: string[]): string | null => {
      const keys = Object.keys(row);
      
      // first try exact matches (case insensitive)
      for (const name of possibleNames) {
        const found = keys.find(key => key.toLowerCase() === name.toLowerCase());
        if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') {
          return row[found];
        }
      }
      
      // then try partial matches
      for (const name of possibleNames) {
        const found = keys.find(key => 
          key.toLowerCase().includes(name.toLowerCase()) || 
          name.toLowerCase().includes(key.toLowerCase())
        );
        if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') {
          return row[found];
        }
      }
      
      return null;
    };

    // process each row
    const processedProjects = rawData.map((row, index) => {
      const project = {
        organization_name: findColumn(row, columnMappings.organization) || `organization ${index + 1}`,
        project_title: findColumn(row, columnMappings.project_title) || `project ${index + 1}`,
        project_category: findColumn(row, columnMappings.category) || '',
        organization_type: findColumn(row, columnMappings.organization_type) || '',
        therapeutic_area: findColumn(row, columnMappings.therapeutic_area) || '',
        jury_info: findColumn(row, columnMappings.jury_info) || '',
        objectives_results: findColumn(row, columnMappings.objectives_results) || '',
        presentation_link: findColumn(row, columnMappings.presentation_link) || ''
      };
      
      // use project_title as the main name, fallback to first non-empty value
      project.project_title = project.project_title || Object.values(row)[0]?.toString() || `project ${index + 1}`;
      
      return project;
    }).filter(project => project.project_title && project.project_title.trim() !== '');

    if (processedProjects.length === 0) {
      return NextResponse.json({ error: 'No valid projects found in Excel file' }, { status: 400 });
    }

    // Clear existing projects and project details
    await supabase.from('project_details').delete().neq('id', 0);
    await supabase.from('projects').delete().neq('id', 0);

    // insert new projects and their details
    let projectsCount = 0;
    
    for (const projectData of processedProjects) {
      try {
        // insert project
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: projectData.project_title
          })
          .select()
          .single();

        if (projectError) {
          console.error('Error inserting project:', projectError);
          continue;
        }

        // insert project details
        const { error: detailsError } = await supabase
          .from('project_details')
          .insert({
            project_id: project.id,
            organization_name: projectData.organization_name,
            project_title: projectData.project_title,
            project_category: projectData.project_category,
            organization_type: projectData.organization_type,
            therapeutic_area: projectData.therapeutic_area,
            jury_info: projectData.jury_info,
            objectives_results: projectData.objectives_results,
            presentation_link: projectData.presentation_link
          });

        if (detailsError) {
          console.error('Error inserting project details:', detailsError);
          continue;
        }

        projectsCount++;
      } catch (error) {
        console.error('Error processing project:', error);
        continue;
      }
    }

    return NextResponse.json({ 
      success: true, 
      projectsCount,
      message: `successfully processed ${projectsCount} projects from excel file`
    });

  } catch (error) {
    console.error('Error processing Excel file:', error);
    return NextResponse.json({ 
      error: 'Failed to process Excel file. Please check the file format.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 