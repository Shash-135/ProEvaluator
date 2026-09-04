import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { BatchesTab } from '../components/admin/tabs/BatchesTab';
import { UsersTab } from '../components/admin/tabs/UsersTab';
import { ReportsTab } from '../components/admin/tabs/ReportsTab';
import { LogsTab } from '../components/admin/tabs/LogsTab';
import { BatchModal } from '../components/admin/modals/BatchModal';
import { MilestoneModal } from '../components/admin/modals/MilestoneModal';
import { MoveMemberModal } from '../components/admin/modals/MoveMemberModal';
import { AssignTeacherModal } from '../components/admin/modals/AssignTeacherModal';
import { AddUserModal } from '../components/admin/modals/AddUserModal';
import { CohortModal } from '../components/admin/modals/CohortModal';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('batches');
  const [selectedCohortId, setSelectedCohortId] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [batchDetailTab, setBatchDetailTab] = useState('milestones');

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showMoveMemberModal, setShowMoveMemberModal] = useState(false);
  const [assignTeamId, setAssignTeamId] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showCohortModal, setShowCohortModal] = useState(false);

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
    enabled: activeTab === 'users' || showAddUserModal || assignTeamId !== null
  });

  const { data: teamsData } = useQuery({
    queryKey: ['admin-teams', selectedBatchId],
    queryFn: async () => (await api.get(`/admin/teams?batchId=${selectedBatchId || ''}`)).data,
    enabled: !!selectedBatchId || showMoveMemberModal
  });

  const teachers = allUsersData?.users?.filter((u) => u.role === 'teacher') || [];

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
              setShowCohortModal={setShowCohortModal}
              setShowMilestoneModal={setShowMilestoneModal}
              setShowMoveMemberModal={setShowMoveMemberModal}
              setAssignTeamId={setAssignTeamId}
              setSelectedTeacherId={setSelectedTeacherId}
            />
          )}

          {activeTab === 'users' && <UsersTab setShowAddUserModal={setShowAddUserModal} />}
          {activeTab === 'reports' && <ReportsTab cohortsData={cohortsData} selectedCohortId={selectedCohortId} setSelectedCohortId={setSelectedCohortId} />}
          {activeTab === 'logs' && <LogsTab />}
        </div>
      </div>

      {showBatchModal && <BatchModal setShowBatchModal={setShowBatchModal} activeCohortId={selectedCohortId} />}
      {showCohortModal && <CohortModal setShowCohortModal={setShowCohortModal} />}
      {showMilestoneModal && <MilestoneModal setShowMilestoneModal={setShowMilestoneModal} activeBatchId={selectedBatchId} />}
      {showMoveMemberModal && <MoveMemberModal setShowMoveMemberModal={setShowMoveMemberModal} teamsData={teamsData} />}
      {assignTeamId && <AssignTeacherModal assignTeamId={assignTeamId} setAssignTeamId={setAssignTeamId} selectedTeacherId={selectedTeacherId} setSelectedTeacherId={setSelectedTeacherId} teachers={teachers} />}
      {showAddUserModal && <AddUserModal setShowAddUserModal={setShowAddUserModal} activeBatchId={selectedBatchId} teachers={teachers} />}
    </div>
  );
};
