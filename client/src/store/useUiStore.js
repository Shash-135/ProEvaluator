import { create } from 'zustand';

export const useUiStore = create((set) => ({
  activeTab: 'overview',
  isGradeModalOpen: false,
  selectedStudentForGrading: null,
  selectedMilestoneForGrading: null,
  isAssignTeacherModalOpen: false,
  selectedTeamForAssignment: null,
  isCreateBatchModalOpen: false,
  isCreateMilestoneModalOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),

  openGradeModal: (student, milestone) =>
    set({
      isGradeModalOpen: true,
      selectedStudentForGrading: student,
      selectedMilestoneForGrading: milestone
    }),

  closeGradeModal: () =>
    set({
      isGradeModalOpen: false,
      selectedStudentForGrading: null,
      selectedMilestoneForGrading: null
    }),

  openAssignTeacherModal: (team) =>
    set({
      isAssignTeacherModalOpen: true,
      selectedTeamForAssignment: team
    }),

  closeAssignTeacherModal: () =>
    set({
      isAssignTeacherModalOpen: false,
      selectedTeamForAssignment: null
    }),

  openCreateBatchModal: () => set({ isCreateBatchModalOpen: true }),
  closeCreateBatchModal: () => set({ isCreateBatchModalOpen: false }),

  openCreateMilestoneModal: () => set({ isCreateMilestoneModalOpen: true }),
  closeCreateMilestoneModal: () => set({ isCreateMilestoneModalOpen: false })
}));
