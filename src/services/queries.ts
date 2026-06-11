import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Member, AnnualContribution, SpecialContribution, Disbursement, Meeting, AnnualPayment, SpecialPayment, Attendance } from '@/types'

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('nom', { ascending: true })
      if (error) throw error
      return data as Member[]
    }
  })
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['member', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Member
    },
    enabled: !!id
  })
}

export function useCreateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (member: Omit<Member, 'id' | 'created_at' | 'updated_at' | 'qr_code'>) => {
      const { data, error } = await supabase.from('members').insert(member).select().single()
      if (error) throw error
      return data as Member
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] })
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...member }: Partial<Member> & { id: string }) => {
      const { data, error } = await supabase.from('members').update(member).eq('id', id).select().single()
      if (error) throw error
      return data as Member
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] })
  })
}

export function useDeleteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('members').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] })
  })
}

export function useAnnualContributions() {
  return useQuery({
    queryKey: ['annual-contributions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annual_contributions')
        .select('*')
        .order('annee', { ascending: false })
      if (error) throw error
      return data as AnnualContribution[]
    }
  })
}

export function useAnnualPayments(contributionId?: string) {
  return useQuery({
    queryKey: ['annual-payments', contributionId],
    queryFn: async () => {
      let query = supabase
        .from('annual_payments')
        .select('*, contribution:annual_contributions(*), member:members(*)')
        .order('date_paiement', { ascending: false })
      if (contributionId) query = query.eq('contribution_id', contributionId)
      const { data, error } = await query
      if (error) throw error
      return data as AnnualPayment[]
    },
    enabled: true
  })
}

export function useSpecialContributions() {
  return useQuery({
    queryKey: ['special-contributions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('special_contributions')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as SpecialContribution[]
    }
  })
}

export function useSpecialPayments(contributionId?: string) {
  return useQuery({
    queryKey: ['special-payments', contributionId],
    queryFn: async () => {
      let query = supabase
        .from('special_payments')
        .select('*, contribution:special_contributions(*), member:members(*)')
        .order('date_paiement', { ascending: false })
      if (contributionId) query = query.eq('contribution_id', contributionId)
      const { data, error } = await query
      if (error) throw error
      return data as SpecialPayment[]
    },
    enabled: true
  })
}

export function useDisbursements() {
  return useQuery({
    queryKey: ['disbursements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disbursements')
        .select('*, items:disbursement_items(*)')
        .order('date', { ascending: false })
      if (error) throw error
      return data as Disbursement[]
    }
  })
}

export function useMeetings() {
  return useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      return data as Meeting[]
    }
  })
}

export function useAttendances(meetingId?: string) {
  return useQuery({
    queryKey: ['attendances', meetingId],
    queryFn: async () => {
      let query = supabase
        .from('attendances')
        .select('*, meeting:meetings(*), member:members(*)')
        .order('created_at', { ascending: false })
      if (meetingId) query = query.eq('meeting_id', meetingId)
      const { data, error } = await query
      if (error) throw error
      return data as Attendance[]
    },
    enabled: true
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data: members, error: membersError } = await supabase.from('members').select('id, statut')
      if (membersError) throw membersError

      const total = members.length
      const actifs = members.filter(m => m.statut === 'Actif').length
      const inactifs = total - actifs

      const { data: annualPayments, error: apError } = await supabase
        .from('annual_payments')
        .select('montant, statut, member_id')
        .eq('statut', 'Confirmé')
      if (apError) throw apError

      const { data: specialPayments, error: spError } = await supabase
        .from('special_payments')
        .select('montant, statut, member_id')
        .eq('statut', 'Confirmé')
      if (spError) throw spError

      const recettes = [...(annualPayments || []), ...(specialPayments || [])]
        .reduce((sum, p) => sum + Number(p.montant), 0)

      const { data: disbursements, error: dError } = await supabase
        .from('disbursements')
        .select('total_montant')
      if (dError) throw dError

      const depenses = (disbursements || []).reduce((sum, d) => sum + Number(d.total_montant), 0)

      const solde = recettes - depenses

      const totalMembres = members.length
      const totalMemberIds = new Set(members.map(m => m.id))
      const paidMemberIds = new Set([
        ...(annualPayments || []).map(p => p.member_id),
        ...(specialPayments || []).map(p => p.member_id)
      ].filter(Boolean))
      const impayes = totalMembres - paidMemberIds.size

      return { total, actifs, inactifs, recettes, depenses, solde, impayes }
    }
  })
}

export function useCreatePayment(type: 'annual' | 'special') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payment: Omit<AnnualPayment | SpecialPayment, 'id' | 'created_at'>) => {
      const table = type === 'annual' ? 'annual_payments' : 'special_payments'
      const { data, error } = await supabase.from(table).insert(payment).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type === 'annual' ? 'annual-payments' : 'special-payments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    }
  })
}

export function useUpdatePayment(type: 'annual' | 'special') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; montant?: number; date_paiement?: string; mode_paiement?: string; statut?: string; observation?: string }) => {
      const table = type === 'annual' ? 'annual_payments' : 'special_payments'
      const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type === 'annual' ? 'annual-payments' : 'special-payments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    }
  })
}

export function useDeletePayment(type: 'annual' | 'special') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const table = type === 'annual' ? 'annual_payments' : 'special_payments'
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type === 'annual' ? 'annual-payments' : 'special-payments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    }
  })
}

export function useCreateContribution(type: 'annual' | 'special') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const table = type === 'annual' ? 'annual_contributions' : 'special_contributions'
      const { data: result, error } = await supabase.from(table).insert(data).select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: [type === 'annual' ? 'annual-contributions' : 'special-contributions']
    })
  })
}
