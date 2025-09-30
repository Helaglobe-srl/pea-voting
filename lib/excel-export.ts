import * as XLSX from 'xlsx';
import type { 
  VoteWithEmailAndWeight, 
  Project, 
  Criterion, 
  Juror, 
  CategoryWinner, 
  SpecialMention 
} from './types';

// utility function to create excel file and download
const downloadExcel = (workbook: XLSX.WorkBook, filename: string) => {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

// export admin voting matrix data
export const exportAdminVotingMatrix = (
  votes: VoteWithEmailAndWeight[],
  jurors: Juror[],
  projects: Project[],
  criteria: Criterion[]
) => {
  const workbook = XLSX.utils.book_new();
  
  // create vote matrix: user -> project -> criteria -> score
  const voteMatrix = new Map<string, Map<number, Map<number, number>>>();
  votes.forEach(vote => {
    const userId = vote.user_id;
    const projectId = vote.project_id;
    const criteriaId = vote.criteria_id;
    
    if (!voteMatrix.has(userId)) {
      voteMatrix.set(userId, new Map());
    }
    if (!voteMatrix.get(userId)!.has(projectId)) {
      voteMatrix.get(userId)!.set(projectId, new Map());
    }
    voteMatrix.get(userId)!.get(projectId)!.set(criteriaId, vote.score);
  });

  // helper function to get average score
  const getAverageScore = (userId: string, projectId: number): number | null => {
    const userVotes = voteMatrix.get(userId);
    if (!userVotes || !userVotes.has(projectId)) return null;
    
    const projectVotes = userVotes.get(projectId)!;
    const scores = Array.from(projectVotes.values());
    
    if (scores.length === 0) return null;
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return parseFloat(average.toFixed(1));
  };

  // helper function to get project average
  const getProjectAverage = (projectId: number): number => {
    const allScores: number[] = [];
    jurors.forEach(user => {
      const avgScore = getAverageScore(user.user_id, projectId);
      if (avgScore !== null) allScores.push(avgScore);
    });
    
    if (allScores.length === 0) return 0;
    const average = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    return parseFloat(average.toFixed(1));
  };

  // group projects by category
  const projectsByCategory = projects.reduce((acc, project) => {
    const category = project.project_category || 'senza categoria';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  // sort projects within each category by organization_name
  Object.keys(projectsByCategory).forEach(category => {
    projectsByCategory[category].sort((a: Project, b: Project) => {
      const orgA = a.organization_name || '';
      const orgB = b.organization_name || '';
      return orgA.localeCompare(orgB);
    });
  });

  // create worksheet for each category
  Object.entries(projectsByCategory).forEach(([category, categoryProjects]) => {
    const worksheetData: (string | number)[][] = [];
    
    // headers
    const headers = [
      'giurato',
      'email',
      'tipo giurato',
      ...categoryProjects.map(p => `${p.name} (${p.organization_name || 'n/a'})`),
      'media utente'
    ];
    worksheetData.push(headers);

    // data rows
    jurors.forEach(user => {
      const row = [
        `${user.nome || ''} ${user.cognome || ''}`.trim() || user.email,
        user.email,
        user.rappresenta_associazione ? 'associazione' : 'individuale'
      ];

      const userScores: number[] = [];
      categoryProjects.forEach(project => {
        const score = getAverageScore(user.user_id, project.id);
        row.push(score !== null ? score.toString() : '-');
        if (score !== null) userScores.push(score);
      });

      // user average
      const userAverage = userScores.length > 0 
        ? parseFloat((userScores.reduce((sum, score) => sum + score, 0) / userScores.length).toFixed(1)).toString()
        : '-';
      row.push(userAverage);

      worksheetData.push(row);
    });

    // project averages row
    const avgRow = ['medie progetti', '', ''];
    categoryProjects.forEach(project => {
      const projectAvg = getProjectAverage(project.id);
      avgRow.push(projectAvg > 0 ? projectAvg.toString() : '-');
    });
    
    // category average
    const categoryAvg = categoryProjects.length > 0 
      ? parseFloat((categoryProjects.reduce((sum, project) => sum + getProjectAverage(project.id), 0) / categoryProjects.length).toFixed(1)).toString()
      : '-';
    avgRow.push(categoryAvg);
    
    worksheetData.push(avgRow);

    // create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // set column widths
    const colWidths = [
      { wch: 25 }, // giurato
      { wch: 30 }, // email
      { wch: 15 }, // tipo giurato
      ...categoryProjects.map(() => ({ wch: 20 })), // projects
      { wch: 15 }  // media utente
    ];
    worksheet['!cols'] = colWidths;

    // add worksheet to workbook
    const sheetName = category.length > 31 ? category.substring(0, 31) : category;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  // create summary worksheet with all votes
  const summaryData: (string | number)[][] = [];
  summaryData.push([
    'giurato',
    'email',
    'tipo giurato',
    'progetto',
    'organizzazione',
    'categoria',
    ...criteria.map(c => c.name),
    'media progetto'
  ]);

  jurors.forEach(user => {
    projects.forEach(project => {
      const userVotes = voteMatrix.get(user.user_id);
      if (userVotes && userVotes.has(project.id)) {
        const projectVotes = userVotes.get(project.id)!;
        const row = [
          `${user.nome || ''} ${user.cognome || ''}`.trim() || user.email,
          user.email,
          user.rappresenta_associazione ? 'associazione' : 'individuale',
          project.name,
          project.organization_name || '',
          project.project_category || ''
        ];

        const scores: number[] = [];
        criteria.forEach(criterion => {
          const score = projectVotes.get(criterion.id);
          row.push(score !== undefined ? score.toString() : '-');
          if (score !== undefined) scores.push(score);
        });

        const avgScore = scores.length > 0 
          ? parseFloat((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)).toString()
          : '-';
        row.push(avgScore);

        summaryData.push(row);
      }
    });
  });

  const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
  const summaryColWidths = [
    { wch: 25 }, // giurato
    { wch: 30 }, // email
    { wch: 15 }, // tipo giurato
    { wch: 30 }, // progetto
    { wch: 25 }, // organizzazione
    { wch: 20 }, // categoria
    ...criteria.map(() => ({ wch: 15 })), // criteria
    { wch: 15 }  // media progetto
  ];
  summaryWorksheet['!cols'] = summaryColWidths;
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'tutti i voti');

  const timestamp = new Date().toISOString().split('T')[0];
  downloadExcel(workbook, `pea_awards_admin_${timestamp}`);
};

// export results page data
export const exportResultsData = (
  categoryWinners: { [category: string]: CategoryWinner[] },
  specialMentions: SpecialMention[],
  uniqueVoterCount: number,
  totalVotes: number
) => {
  const workbook = XLSX.utils.book_new();

  // create winners worksheet
  const winnersData: (string | number)[][] = [];
  winnersData.push([
    'categoria',
    'posizione',
    'progetto',
    'organizzazione',
    'punteggio medio',
    'podio',
    'descrizione'
  ]);

  Object.entries(categoryWinners).forEach(([category, winners]) => {
    winners.forEach(winner => {
      winnersData.push([
        category.toLowerCase(),
        `${winner.position}°`,
        winner.project.name,
        winner.project.organization_name || '',
        winner.averageScore,
        winner.position <= 3 ? 'sì' : 'no',
        winner.project.jury_info || winner.project.objectives_results || ''
      ]);
    });
  });

  const winnersWorksheet = XLSX.utils.aoa_to_sheet(winnersData);
  winnersWorksheet['!cols'] = [
    { wch: 25 }, // categoria
    { wch: 10 }, // posizione
    { wch: 30 }, // progetto
    { wch: 25 }, // organizzazione
    { wch: 15 }, // punteggio medio
    { wch: 10 }, // podio
    { wch: 50 }  // descrizione
  ];
  XLSX.utils.book_append_sheet(workbook, winnersWorksheet, 'vincitori per categoria');

  // create special mentions worksheet
  const mentionsData: (string | number)[][] = [];
  mentionsData.push([
    'tipo menzione',
    'posizione',
    'progetto',
    'organizzazione',
    'punteggio',
    'podio',
    'descrizione menzione',
    'descrizione progetto'
  ]);

  specialMentions.forEach(mention => {
    mentionsData.push([
      mention.type.toLowerCase(),
      `${mention.position}°`,
      mention.project.name,
      mention.project.organization_name || '',
      mention.score,
      mention.position <= 3 ? 'sì' : 'no',
      mention.description,
      mention.project.jury_info || mention.project.objectives_results || ''
    ]);
  });

  const mentionsWorksheet = XLSX.utils.aoa_to_sheet(mentionsData);
  mentionsWorksheet['!cols'] = [
    { wch: 20 }, // tipo menzione
    { wch: 10 }, // posizione
    { wch: 30 }, // progetto
    { wch: 25 }, // organizzazione
    { wch: 12 }, // punteggio
    { wch: 10 }, // podio
    { wch: 50 }, // descrizione menzione
    { wch: 50 }  // descrizione progetto
  ];
  XLSX.utils.book_append_sheet(workbook, mentionsWorksheet, 'menzioni speciali');

  const timestamp = new Date().toISOString().split('T')[0];
  downloadExcel(workbook, `pea_awards_risultati_${timestamp}`);
};

// export projects summary with category and average vote
export const exportProjectsSummary = (
  votes: VoteWithEmailAndWeight[],
  jurors: Juror[],
  projects: Project[],
  criteria: Criterion[]
) => {
  const workbook = XLSX.utils.book_new();
  
  // create vote matrix: user -> project -> criteria -> score
  const voteMatrix = new Map<string, Map<number, Map<number, number>>>();
  votes.forEach(vote => {
    const userId = vote.user_id;
    const projectId = vote.project_id;
    const criteriaId = vote.criteria_id;
    
    if (!voteMatrix.has(userId)) {
      voteMatrix.set(userId, new Map());
    }
    if (!voteMatrix.get(userId)!.has(projectId)) {
      voteMatrix.get(userId)!.set(projectId, new Map());
    }
    voteMatrix.get(userId)!.get(projectId)!.set(criteriaId, vote.score);
  });

  // helper function to get project average across all jurors
  const getProjectAverage = (projectId: number): number => {
    const allScores: number[] = [];
    jurors.forEach(juror => {
      const userVotes = voteMatrix.get(juror.user_id);
      if (userVotes && userVotes.has(projectId)) {
        const projectVotes = userVotes.get(projectId)!;
        const scores = Array.from(projectVotes.values());
        if (scores.length > 0) {
          const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
          allScores.push(average);
        }
      }
    });
    
    if (allScores.length === 0) return 0;
    const average = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    return parseFloat(average.toFixed(2));
  };

  // create projects summary data
  const summaryData: (string | number)[][] = [];
  summaryData.push([
    'progetto',
    'organizzazione',
    'categoria',
    'punteggio medio',
    'numero giurati votanti',
    'descrizione progetto'
  ]);

  // sort projects by category, then by average score (descending)
  const sortedProjects = [...projects].sort((a, b) => {
    const categoryA = a.project_category || 'senza categoria';
    const categoryB = b.project_category || 'senza categoria';
    
    if (categoryA !== categoryB) {
      return categoryA.localeCompare(categoryB);
    }
    
    const avgA = getProjectAverage(a.id);
    const avgB = getProjectAverage(b.id);
    return avgB - avgA; // descending order
  });

  sortedProjects.forEach(project => {
    const averageScore = getProjectAverage(project.id);
    
    // count how many jurors voted for this project
    const votingJurors = jurors.filter(juror => {
      const userVotes = voteMatrix.get(juror.user_id);
      return userVotes && userVotes.has(project.id);
    }).length;

    summaryData.push([
      project.name,
      project.organization_name || '',
      project.project_category || 'senza categoria',
      averageScore > 0 ? averageScore : '-',
      votingJurors,
      project.jury_info || project.objectives_results || ''
    ]);
  });

  const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWorksheet['!cols'] = [
    { wch: 35 }, // progetto
    { wch: 30 }, // organizzazione
    { wch: 25 }, // categoria
    { wch: 15 }, // punteggio medio
    { wch: 20 }, // numero giurati votanti
    { wch: 50 }  // descrizione progetto
  ];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'riepilogo progetti');

  const timestamp = new Date().toISOString().split('T')[0];
  downloadExcel(workbook, `pea_awards_progetti_riepilogo_${timestamp}`);
};