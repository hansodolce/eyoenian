export type UserRole = 'admin' | 'gestionnaire' | 'member';

export interface Profile {
  id: string;
  email?: string;
  phone?: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
  pin?: string;
  created_at: string;
}

export interface Member {
  id: string;
  nom: string;
  prenoms: string;
  telephone: string;
  adresse?: string;
  sexe: 'M' | 'F';
  date_naissance?: string;
  photo_url?: string;
  date_adhesion: string;
  fonction?: string;
  statut: 'Actif' | 'Inactif';
  qr_code?: string;
  created_at: string;
  updated_at: string;
}

export interface AnnualContribution {
  id: string;
  annee: number;
  montant: number;
  description?: string;
  date_limite?: string;
  created_at: string;
}

export interface AnnualPayment {
  id: string;
  contribution_id: string;
  member_id: string;
  montant: number;
  date_paiement: string;
  mode_paiement: 'Espèces' | 'Mobile Money' | 'Autres';
  statut: 'En attente' | 'Confirmé' | 'Rejeté';
  observation?: string;
  created_at: string;
  contribution?: AnnualContribution;
  member?: Member;
}

export interface SpecialContribution {
  id: string;
  titre: string;
  description?: string;
  montant: number;
  date_limite?: string;
  type: 'Décès' | 'Mariage' | 'Projet' | 'Voyage' | 'Événement' | 'Soutien spécial' | 'Autre';
  created_at: string;
}

export interface SpecialPayment {
  id: string;
  contribution_id: string;
  member_id: string;
  montant: number;
  date_paiement: string;
  mode_paiement: 'Espèces' | 'Mobile Money' | 'Autres';
  statut: 'En attente' | 'Confirmé' | 'Rejeté';
  observation?: string;
  created_at: string;
  contribution?: SpecialContribution;
  member?: Member;
}

export interface Disbursement {
  id: string;
  reference: string;
  date: string;
  responsable: string;
  observation?: string;
  total_montant: number;
  created_at: string;
  items?: DisbursementItem[];
}

export interface DisbursementItem {
  id: string;
  disbursement_id: string;
  designation: string;
  montant: number;
}

export interface Meeting {
  id: string;
  date: string;
  heure: string;
  lieu: string;
  objet: string;
  observation?: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  meeting_id: string;
  member_id: string;
  statut: 'Présent' | 'Absent' | 'Excusé';
  created_at: string;
  meeting?: Meeting;
  member?: Member;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface ImportLog {
  id: string;
  fichier: string;
  type: string;
  lignes_total: number;
  lignes_importees: number;
  lignes_erreurs: number;
  rapport: string;
  created_at: string;
}

export interface AssociationSettings {
  nom: string;
  logo_url?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  pin_global?: string;
}

export type PaymentStatus = 'En attente' | 'Confirmé' | 'Rejeté';
export type PaymentMode = 'Espèces' | 'Mobile Money' | 'Autres';
export type MemberStatus = 'Actif' | 'Inactif';
export type AttendanceStatus = 'Présent' | 'Absent' | 'Excusé';
