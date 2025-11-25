// validation utilities for registration forms

export function validatePhoneNumber(phone: string): boolean {
  /**
   * validazione del formato del numero di telefono italiano.
   * formati validi:
   * - +39 XXX XXXXXXX
   * - 0039 XXX XXXXXXX
   * - XXX XXXXXXX
   * - XXXXXXXXXX
   * dove x è un numero, e la lunghezza totale dei numeri deve essere 10
   */
  // per prima cosa rimuovo tutti gli spazi
  let cleanedPhone = phone.replace(/\s/g, "");
  
  // controllo se il numero ha un prefisso internazionale
  if (cleanedPhone.startsWith("+39")) {
    cleanedPhone = cleanedPhone.substring(3);
  } else if (cleanedPhone.startsWith("0039")) {
    cleanedPhone = cleanedPhone.substring(4);
  }
  
  // controllo se il numero ha esattamente 10 cifre
  if (!/^\d{10}$/.test(cleanedPhone)) {
    return false;
  }
  
  // controllo se il numero inizia con un prefisso valido (3XX) o (0)
  const firstDigit = cleanedPhone[0];
  return firstDigit === "3" || firstDigit === "0";
}

export function validateEmail(email: string): boolean {
  /**
   * valida l'email usando:
   * - username può contenere lettere, numeri, punti, trattini, più e underscore
   * - il dominio deve contenere lettere, numeri, punti e trattini
   * - il TLD deve essere almeno 2 caratteri
   * - non sono ammessi punti consecutivi
   * - l'email non può iniziare o finire con un punto
   */
  const emailRegex = /^(?!\.)([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9][a-zA-Z0-9-]*(?:\.[a-zA-Z0-9][a-zA-Z0-9-]*)*\.[a-zA-Z]{2,})$/;
  
  if (!emailRegex.test(email)) {
    return false;
  }
  
  // controlli aggiuntivi
  if (email.includes('..')) {  // non sono ammessi punti consecutivi
    return false;
  }
  if (email.endsWith('.')) {  // l'email non può finire con un punto
    return false;
  }
  if (email.length > 254) {  // limite RFC 5321
    return false;
  }
    
  return true;
}

export function validateText(text: string): boolean {
  /**
   * valida il testo per assicurarsi che non contenga caratteri problematici
   * che potrebbero causare problemi con n8n o json
   * 
   * restituisce:
   * - true se il testo è valido
   * - false se il testo contiene caratteri problematici
   */
  if (typeof text !== 'string') {
    return true;
  }
    
  // controlla caratteri problematici
  const problematicChars = ['"', '\\', '{', '}', '[', ']', '<', '>', '&', '#'];
  for (const char of problematicChars) {
    if (text.includes(char)) {
      return false;
    }
  }
    
  // controlla caratteri di controllo, escludendo newline, carriage return e tab
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text)) {
    return false;
  }
    
  return true;
}

export function getInvalidChars(text: string): string {
  /**
   * identifica i caratteri problematici nel testo
   * 
   * restituisce:
   * - una stringa vuota se non ci sono caratteri problematici
   * - una stringa con i caratteri problematici trovati
   */
  if (typeof text !== 'string') {
    return "";
  }
    
  const problematicChars = ['"', '\\', '{', '}', '[', ']', '<', '>', '&', '#'];
  const foundChars: string[] = [];
  
  for (const char of problematicChars) {
    if (text.includes(char)) {
      foundChars.push(char);
    }
  }
    
  // aggiungi eventuali caratteri di controllo trovati, escludendo newline, carriage return e tab
  const controlChars = text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g);
  if (controlChars) {
    foundChars.push('caratteri di controllo');
  }
    
  return foundChars.join(", ");
}

export function cleanText(text: string | number | boolean): string {
  /**
   * pulisce il testo da caratteri che potrebbero causare problem
   */
  if (typeof text !== 'string') {
    return String(text);
  }
  
  // replace backslashes
  let cleaned = text.replace(/\\/g, '');
  // replace quotes with single quotes
  cleaned = cleaned.replace(/"/g, "'");
  // replace newlines and carriage returns with spaces
  cleaned = cleaned.replace(/[\n\r]/g, ' ');
  // remove control characters
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
  // replace other potentially problematic characters
  cleaned = cleaned.replace(/[{}]/g, '()');
  cleaned = cleaned.replace(/[\[\]]/g, '()');
  // remove any HTML/XML tags that might be present
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  // normalize whitespace (replace multiple spaces with a single space)
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}


