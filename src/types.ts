export type Screen = 'landing' | 'acceso' | 'dashboard' | 'calendar' | 'crm' | 'notes' | 'projects' | 'contactos' | 'finanzas' | 'contratos' | 'citas' | 'comerciales_acceso' | 'comerciales_panel' | 'comerciales_admin' | 'cold_calling' | 'developer_hub' | 'marketing' | 'departamentos';

export interface DemoSite {
 id: string;
 name: string;
 businessType: string;
 publicUrl: string;
 adminUrl: string;
 imageUrl?: string;
 supabaseUrl?: string;
 supabaseAnonKey?: string;
 stripePublishableKey?: string;
 adminUser?: string;
 adminPassword?: string;
 notes?: string;
}

export interface InquiryMessage {
 id: string;
 name: string;
 email: string;
 message: string;
 archived?: boolean;
 created_at?: string;
}

export interface ClientContact {
 id: string;
 name: string;
 email: string;
 company: string;
 status: 'Client' | 'Lead';
 lastContacted: string;
 role?: string;
 priority?: boolean;
 avatarUrl?: string;
 location?: string;
 addedDate?: string;
 website?: string;
 demoWebsiteId?: string;
 customWebsiteUrl?: string;
 websiteType?: string;
 websiteCredentials?: string;
 supabaseCredentials?: string;
 companyEmailCredentials?: string;
 platformCredentials?: string;
 githubRepo?: string;
 hostingCredentials?: string;
 phone?: string;
 linkedin?: string;
 assignedUserId?: string;
 assignedUserEmail?: string;
 initials: string;
 color?: string;
 temperature?: 'Frío' | 'Templado' | 'Caliente';
 notes?: string;
 contactedByComercialName?: string;
 contactedByComercialEmail?: string;
 originalLeadNotes?: string;
 closingSourceLeadId?: string;
 closerName?: string;
 closerEmail?: string;
 closingStatus?: 'Pendiente' | 'Cerrado' | 'Perdido';
 closingAnswered?: boolean;
 closingNotes?: string;
 closingSocials?: string;
 googleMapsUrl?: string;
 needsWebsite?: boolean;
 websiteReady?: boolean;
 webReadyNotifiedAt?: string;
 // Developer Hub Properties
 devStatus?: 'backlog' | 'design' | 'development' | 'testing' | 'deployed' | 'completed';
 devAssignedTo?: string;
 devDeadline?: string;
 devCompletedAt?: string;
 devTechStack?: string[];
 devChecklist?: string; // stringified JSON tasks: { id: string; text: string; done: boolean }[]
 devNotes?: string;
 devWebsiteConfig?: string; // stringified JSON demo website config
 // Stripe integration properties
 stripeCustomerId?: string;
 stripeSubscriptionId?: string;
 stripeSubscriptionStatus?: 'active' | 'trialing' | 'canceled' | 'past_due' | 'none';
 stripeSubscriptionPrice?: string;
 stripeSubscriptionInterval?: string;
 callsLog?: CallLogItem[];
}

export interface CalendarEvent {
 id: string;
 title: string;
 date: string; // YYYY-MM-DD
 time: string; // HH:MM
 duration?: string;
 type: 'Meeting' | 'Review' | 'Deadline' | 'Kickoff' | 'Other';
 description?: string;
 linkedContactId?: string;
 linkedContactName?: string;
 linkedContactIds?: string[];
 linkedNoteIds?: string[];
 reminders?: string[];
 meetingUrl?: string;
 assignedUserId?: string;
 assignedUserEmail?: string;
 assignedUserEmails?: string[];
 status?: 'pending' | 'done' | 'postponed';
 parentEventId?: string;
 color?: string;
 alias?: string;
 comercialId?: string;
 isAllComerciales?: boolean;
 isAdminNotification?: boolean;
 notes?: string;
 isPrivate?: boolean;
 whatsappUrl?: string;
 recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
 recurrenceCount?: number;
 recurrenceGroupId?: string;
}

export interface Note {
 id: string;
 title: string;
 content: string;
 category: 'Project Specs' | 'Client Feedback' | 'Dev Tips' | 'Infrastructure' | 'General';
 updatedAt: string;
 authorName?: string;
 authorAvatar?: string;
 status?: 'pending' | 'done';
}

export interface Activity {
 id: string;
 type: 'CRM' | 'Lead' | 'Task' | 'Alert';
 timestamp: string;
 title: string;
 subtitle: string;
 detail?: string;
 accentColor: 'primary' | 'tertiary' | 'secondary' | 'error';
}

export interface FinanceTransaction {
 id: string;
 type: 'income' | 'expense';
 category: string;
 amount: number;
 date: string;
 description: string;
 isRecurring?: boolean;
 recurrencePeriod?: 'weekly' | 'monthly' | 'yearly';
 invoiceId?: string; // Optional reference to a generated invoice
 status: 'paid' | 'pending';
 paymentMethod?: 'cash' | 'transfer' | 'stripe'; // New: payment method 'cash', 'transfer' or 'stripe'
 firstAmount?: number; // Cost of the first occurrence
 nextAmount?: number; // Cost of the subsequent occurrences
 clientId?: string;
 stripePlanId?: string;
 stripeCheckoutUrl?: string;
 stripeCheckoutSessionId?: string;
 stripeInvoiceId?: string;
 stripeInstallmentIndex?: number;
 stripeInstallmentCount?: number;
 comercialId?: string; // New: associated commercial ID
 comercialEmail?: string; // New: associated commercial email
 isInitialSale?: boolean; // New: is initial acquisition sale
}

export interface InvoiceItem {
 id: string;
 description: string;
 quantity: number;
 unitPrice: number;
 total: number;
 isPending?: boolean;  // New: indicates if this item is currently pending payment (cobró pendiente)
 pendingTxId?: string; // New: matching pending FinanceTransaction ID
 paymentMethod?: 'cash' | 'transfer' | 'stripe'; // New: payment method 'cash', 'transfer' or 'stripe'
}

export interface Invoice {
 id: string;
 clientId?: string;
 clientName: string;
 clientEmail: string;
 date: string;
 dueDate: string;
 status: 'draft' | 'sent' | 'paid' | 'overdue';
 items: InvoiceItem[];
 subtotal: number;
 taxPercentage: number;
 taxAmount: number;
 total: number;
 notes?: string;
 alias?: string;
 color?: string;
 comercialId?: string; // New: associated commercial ID
 comercialEmail?: string; // New: associated commercial email
 isInitialSale?: boolean; // New: is initial acquisition sale
}

export interface PayoutTransaction {
 id: string;
 comercialId: string;
 amount: number;
 date: string;
 status: 'completed' | 'failed';
 bankAccount: string;
 bankName?: string;
 stripeTransferId?: string;
 stripeConnectAccountId?: string;
 paymentMethod?: 'stripe' | 'transfer' | 'cash';
}

export interface ExtraCommission {
 id: string;
 amount: number;
 date: string;
 reason: string;
 linkedTransactionId?: string;
 linkedTransactionDescription?: string;
 linkedTransactionAmount?: number;
 percentage?: number;
 status?: 'pending' | 'paid';
}

export interface ComercialAccount {
 id: string;
 name: string;
 email: string;
 avatarUrl?: string;
 password?: string;
 createdAt: string;
 phone?: string;
 commissionPercentage?: number; // New: customizable commission percentage
 iban?: string;
 bic?: string;
 bankName?: string;
 stripeConnectAccountId?: string;
 stripeOnboardingCompleted?: boolean;
 stripePayoutsEnabled?: boolean;
 stripeChargesEnabled?: boolean;
 payouts?: PayoutTransaction[];
 extraCommissions?: ExtraCommission[];
 monthlyPerformance?: Record<string, MonthlyPerformanceReview>;
 legacyBonuses?: LegacyBonus[];
}

export type LegacyBonusType = 'sale_assist' | 'training' | 'monthly_idea';

export interface LegacyBonus {
 id: string;
 type: LegacyBonusType;
 quantity: number;
 points: number;
 date: string;
 note?: string;
 createdAt: string;
}

export interface MonthlyPerformanceReview {
 month: string; // YYYY-MM
 showRate: number; // 0-100, introducido por administración
 professionalism: number; // 0-10, introducido por administración
 effectiveHours?: number;
 punctuality?: number;
 meetingAttendance?: number;
 processCompliance?: number;
 attitude?: number;
 communication?: number;
 taskCompletion?: number;
 updatedAt?: string;
}

export interface ComercialLead {
 id: string;
 comercialId: string;
 comercialName: string;
 name: string;
 company: string;
 email: string;
 phone: string;
 status: 'Pendiente' | 'Contactado' | 'Negociación' | 'Ganado' | 'Perdido';
 value: number;
 notes: string;
 createdAt: string;
 temperature?: 'Frío' | 'Templado' | 'Caliente';
 isDone?: boolean;
}

export interface CallLogItem {
 id: string;
 date: string;
 notes: string;
 result: string;
}

export interface ColdCallingLead {
 id: string;
 businessName: string;   // NOMBRE DE NEGOCIO
 contactPerson: string;   // NOMBRE CON QUIEN HABLÉ / DUEÑO
 phone: string;     // TELEFONO
 callDate: string;    // FECHA DE LLAMADA (e.g., YYYY-MM-DD or readable)
 
 // Formulario fields
 contacted: 'Sí' | 'No';   // CONTACTADO (si/no)
 isOwner: 'Sí' | 'No';   // ERA EL DUEÑO (SI/NO)
 answered: 'Sí' | 'No';   // RESPONDE (SI/NO)
 temperature: 'Frío' | 'Templado' | 'Caliente'; // TEMPERATURA
 callbackScheduled: 'Sí' | 'No' | 'Llamar más tarde'; // AGENDADA
 
 // Llamar más tarde fields
 callbackDate?: string;   // FECHA (CALENDARIO) YYYY-MM-DD
 callbackTime?: string;   // HORA (HORA) e.g. "14:30"
 
 notes: string;     // NOTAS
 
 // Control fields
 assignedToEmail: string;   // Assigned comercial's email, or 'unassigned'
 assignedToName?: string;   // Assigned comercial's name
 closingOriginComercialEmail?: string;
 closingOriginComercialName?: string;
 archived?: boolean;    // archived flag
 isDone?: boolean;    // Done (tick) flag for comercial organization
 createdAt: string;
 demoWebsiteId?: string;
 position?: number;
 rating?: number;
 reviews?: number;
 website?: string;
 hasWebsite?: boolean;
 sourceStatus?: string;
 info?: string;
 mapsUrl?: string;

 // New fields for tracking calls history and count
 callsCount?: number;    // Veces que se le ha llamado
 callsLog?: CallLogItem[];  // Historial de llamadas
 prospectGroupId?: string;
}

export interface ColdCallingProspectGroup {
 id: string;
 ownerCommercialId: string;
 ownerEmail: string;
 ownerName: string;
 name: string;
 color: string;
 createdAt: string;
}

export type CommercialPresenceStatus = 'available' | 'offline';

export interface CommercialPresence {
 commercialId: string;
 commercialEmail: string;
 commercialName: string;
 status: CommercialPresenceStatus;
 sessionId?: string;
 sessionStartedAt?: string;
 statusChangedAt: string;
 lastSeenAt: string;
}

export interface CommercialWorkSession {
 id: string;
 commercialId: string;
 commercialEmail: string;
 commercialName: string;
 startedAt: string;
 endedAt?: string;
 durationSeconds?: number;
 createdAt: string;
}

export interface CommercialActivityLog {
 id: string;
 commercialId: string;
 commercialEmail: string;
 commercialName: string;
 action: string;
 entityType?: string;
 entityId?: string;
 description: string;
 metadata: Record<string, unknown>;
 createdAt: string;
}
