import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { BatchesTab } from '../components/admin/tabs/BatchesTab';
import { UsersTab } from '../components/admin/tabs/UsersTab';

import { BatchModal } from '../components/admin/modals/BatchModal';
import { MilestoneModal } from '../components/admin/modals/MilestoneModal';
import { MoveMemberModal } from '../components/admin/modals/MoveMemberModal';
import { AssignTeacherModal } from '../components/admin/modals/AssignTeacherModal';
import { AddUserModal } from '../components/admin/modals/AddUserModal';
import { CohortModal } from '../components/admin/modals/CohortModal';
import { AutoFormTeamsModal } from '../components/admin/modals/AutoFormTeamsModal';
import { AutoAssignFacultyModal } from '../components/admin/modals/AutoAssignFacultyModal';
import { TeamModal } from '../components/admin/modals/TeamModal';
import { EditUserModal } from '../components/admin/modals/EditUserModal';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('batches');
  const [selectedCohortId, setSelectedCohortId] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [batchDetailTab, setBatchDetailTab] = useState('milestones');

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);

  const [showMoveMemberModal, setShowMoveMemberModal] = useState(false);
  const [assignTeamId, setAssignTeamId] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const [showCohortModal, setShowCohortModal] = useState(false);
  const [editingCohort, setEditingCohort] = useState(null);

  const [showAutoFormModal, setShowAutoFormModal] = useState(false);
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const { data: batchesData } = useQuery({
    queryKey: ['admin-batches'],
    queryFn: async () => (await api.get('/admin/batches')).data
  });

  const { data: cohortsData } = useQuery({
    queryKey: ['admin-cohorts'],
    queryFn: async () => (await api.get('/admin/cohorts')).data
  });

  const { data: allUsersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/admin/users')).data,
    enabled: activeTab === 'users' || showAddUserModal || assignTeamId !== null || showTeamModal
  });

  const { data: teamsData } = useQuery({
    queryKey: ['admin-teams', selectedBatchId],
    queryFn: async () => (await api.get(`/admin/teams?batchId=${selectedBatchId || ''}`)).data,
    enabled: !!selectedBatchId || showMoveMemberModal
  });

  const teachers = allUsersData?.users?.filter((u) => u.role === 'teacher') || [];
  const cohorts = cohortsData?.cohorts || [];
  const activeBatch = batchesData?.batches?.find((b) => (b.id || b._id) === selectedBatchId);

  const closeBatchModal = () => {
    setShowBatchModal(false);
    setEditingBatch(null);
  };

  const closeCohortModal = () => {
    setShowCohortModal(false);
    setEditingCohort(null);
  };

  const closeMilestoneModal = () => {
    setShowMilestoneModal(false);
    setEditingMilestone(null);
  };

  const closeTeamModal = () => {
    setShowTeamModal(false);
    setEditingTeam(null);
  };

  const closeEditUserModal = () => {
    setShowEditUserModal(false);
    setEditingUser(null);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-background">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} setSelectedBatchId={setSelectedBatchId} setSelectedCohortId={setSelectedCohortId} />

      <div className="flex-1 flex flex-col min-w-0 max-h-[calc(100vh-4rem)] overflow-y-auto bg-background">
        <div className="p-6 lg:p-10 max-w-[90rem] mx-auto w-full">
          {activeTab === 'batches' && (
            <BatchesTab
              batchesData={batchesData}
              cohortsData={cohortsData}
              selectedCohortId={selectedCohortId}
              setSelectedCohortId={setSelectedCohortId}
              selectedBatchId={selectedBatchId}
              setSelectedBatchId={setSelectedBatchId}
              batchDetailTab={batchDetailTab}
              setBatchDetailTab={setBatchDetailTab}
              setShowBatchModal={setShowBatchModal}
              setEditingBatch={setEditingBatch}
              setShowCohortModal={setShowCohortModal}
              setEditingCohort={setEditingCohort}
              setShowMilestoneModal={setShowMilestoneModal}
              setEditingMilestone={setEditingMilestone}
              setShowMoveMemberModal={setShowMoveMemberModal}
              setAssignTeamId={setAssignTeamId}
              setSelectedTeacherId={setSelectedTeacherId}
              setShowAutoFormModal={setShowAutoFormModal}
              setShowAutoAssignModal={setShowAutoAssignModal}
              setShowTeamModal={setShowTeamModal}
              setEditingTeam={setEditingTeam}
              teachers={teachers}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab
              setShowAddUserModal={setShowAddUserModal}
              setEditingUser={setEditingUser}
              setShowEditUserModal={setShowEditUserModal}
              cohorts={cohorts}
            />
          )}

        </div>
      </div>

      {(showBatchModal || Boolean(editingBatch)) && (
        <BatchModal
          onClose={closeBatchModal}
          setShowBatchModal={setShowBatchModal}
          activeCohortId={selectedCohortId}
          editingBatch={editingBatch}
          setEditingBatch={setEditingBatch}
        />
      )}
      {(showCohortModal || Boolean(editingCohort)) && (
        <CohortModal
          onClose={closeCohortModal}
          setShowCohortModal={setShowCohortModal}
          editingCohort={editingCohort}
          setEditingCohort={setEditingCohort}
        />
      )}
      {(showMilestoneModal || Boolean(editingMilestone)) && (
        <MilestoneModal
          onClose={closeMilestoneModal}
          setShowMilestoneModal={setShowMilestoneModal}
          activeBatchId={selectedBatchId}
          editingMilestone={editingMilestone}
          setEditingMilestone={setEditingMilestone}
        />
      )}
      {showMoveMemberModal && <MoveMemberModal setShowMoveMemberModal={setShowMoveMemberModal} teamsData={teamsData} />}
      {assignTeamId && (
        <AssignTeacherModal
          assignTeamId={assignTeamId}
          setAssignTeamId={setAssignTeamId}
          selectedTeacherId={selectedTeacherId}
          setSelectedTeacherId={setSelectedTeacherId}
          teachers={teachers}
        />
      )}
      {showAddUserModal && <AddUserModal setShowAddUserModal={setShowAddUserModal} activeBatchId={selectedBatchId} teachers={teachers} />}
      {showAutoFormModal && <AutoFormTeamsModal onClose={() => setShowAutoFormModal(false)} setShowModal={setShowAutoFormModal} batch={activeBatch} />}
      {showAutoAssignModal && <AutoAssignFacultyModal onClose={() => setShowAutoAssignModal(false)} setShowModal={setShowAutoAssignModal} batch={activeBatch} />}
      {(showTeamModal || Boolean(editingTeam)) && (
        <TeamModal
          onClose={closeTeamModal}
          setShowModal={setShowTeamModal}
          batchId={selectedBatchId}
          editingTeam={editingTeam}
          teachers={teachers}
        />
      )}
      {(showEditUserModal || Boolean(editingUser)) && (
        <EditUserModal
          onClose={closeEditUserModal}
          user={editingUser}
          setShowModal={setShowEditUserModal}
          cohorts={cohorts}
        />
      )}
    </div>
  );
};

