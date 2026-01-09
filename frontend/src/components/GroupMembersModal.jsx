import { useState, useEffect } from "react";
import { X, Users, UserPlus, UserMinus, Crown } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatstore } from "../store/useChatstore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import EditGroupModal from "./EditGroupModal";

const GroupMembersModal = ({ isOpen, onClose, group: initialGroup }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState({});
  const [group, setGroup] = useState(initialGroup);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const { authUser, onlineUsers } = useAuthStore();
  const { getGroups } = useChatstore();

  // Fetch full group data when modal opens
  useEffect(() => {
    if (isOpen && initialGroup?._id) {
      const fetchFullGroup = async () => {
        setIsLoadingGroup(true);
        try {
          const response = await axiosInstance.get(
            `/group/${initialGroup._id}`
          );
          if (response.data && !response.data.error) {
            const fullGroup = response.data.data;
            console.log("Fetched group data:", {
              id: fullGroup._id,
              name: fullGroup.name,
              adminId: fullGroup.adminId,
              membersCount: fullGroup.members?.length,
              members: fullGroup.members,
            });
            setGroup(fullGroup);
          }
        } catch (error) {
          console.error("Error fetching group details:", error);
          // If fetch fails, use initial group data
          setGroup(initialGroup);
        } finally {
          setIsLoadingGroup(false);
        }
      };
      fetchFullGroup();
    } else {
      setGroup(initialGroup);
    }
  }, [isOpen, initialGroup?._id]);

  if (!isOpen || !group) return null;

  const isAdmin =
    group.adminId?._id === authUser?.data?._id ||
    group.adminId?.toString() === authUser?.data?._id ||
    group.adminId?._id?.toString() === authUser?.data?._id?.toString();

  const handleRemoveMember = async (memberId) => {
    if (!isAdmin) {
      toast.error("Only group admin can remove members");
      return;
    }

    if (memberId === group.adminId?._id || memberId === group.adminId) {
      toast.error("Cannot remove group admin");
      return;
    }

    setIsRemoving({ [memberId]: true });
    try {
      const response = await axiosInstance.delete(
        `/group/${group._id}/members`,
        {
          data: { memberIds: [memberId] },
        }
      );

      if (response.data.error) {
        toast.error(response.data.message);
      } else {
        toast.success("Member removed successfully");
        getGroups(); // Refresh groups
        onClose(); // Close modal to show updated group
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
      console.error("Error removing member:", error);
    } finally {
      setIsRemoving({ [memberId]: false });
    }
  };

  const handleGroupUpdated = async () => {
    // Refresh group data without closing the members modal
    if (group?._id) {
      setIsLoadingGroup(true);
      try {
        const response = await axiosInstance.get(`/group/${group._id}`);
        if (response.data && !response.data.error) {
          setGroup(response.data.data);
        }
      } catch (error) {
        console.error("Error refreshing group:", error);
      } finally {
        setIsLoadingGroup(false);
      }
    }
    getGroups(); // Refresh groups list in sidebar
    setIsEditModalOpen(false);
  };

  // Combine admin and members, with admin first
  // Convert IDs to strings for consistent comparison
  const adminId = group.adminId;
  const adminIdStr = adminId?._id?.toString() || adminId?.toString();

  console.log("Group members processing:", {
    adminId,
    adminIdStr,
    membersArray: group.members,
    membersLength: group.members?.length,
  });

  // Get all members, excluding duplicates of admin
  const uniqueMembers = new Map();

  // Add admin first (always show admin)
  if (adminId) {
    const adminKey = adminId?._id?.toString() || adminId?.toString();
    uniqueMembers.set(adminKey, adminId);
  }

  // Add other members (exclude admin from members array)
  if (Array.isArray(group.members) && group.members.length > 0) {
    group.members.forEach((member) => {
      if (!member) return; // Skip null/undefined

      const memberIdStr = member?._id?.toString() || member?.toString();
      // Only add if it's not the admin
      if (memberIdStr && memberIdStr !== adminIdStr) {
        uniqueMembers.set(memberIdStr, member);
        console.log("Added member:", { memberIdStr, member });
      } else {
        console.log("Skipped member (is admin):", { memberIdStr });
      }
    });
  } else {
    console.log("No members array or empty:", group.members);
  }

  const allMembers = Array.from(uniqueMembers.values());
  console.log("Final allMembers count:", allMembers.length, allMembers);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            <div className="flex items-center gap-2">
              <Users className="size-5" />
              <h2 className="text-lg font-semibold">Group Members</h2>
              <span className="badge badge-sm badge-primary">
                {allMembers.length}/10
              </span>
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Group Info */}
          <div className="p-4 border-b border-base-300 bg-base-200">
            <div className="flex items-center gap-3">
              <img
                src={
                  group.profilePic ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    group.name || "Group"
                  )}&background=6366f1&color=fff&size=200&bold=true`
                }
                alt={group.name}
                className="size-12 rounded-full object-cover"
              />
              <div>
                <h3 className="font-medium">{group.name}</h3>
                <p className="text-sm text-base-content/70">
                  {group.description || "No description"}
                </p>
              </div>
            </div>
          </div>

          {/* Edit Group Button (Admin only) */}
          {isAdmin && allMembers.length < 10 && (
            <div className="p-4 border-b border-base-300">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="btn btn-primary btn-sm w-full gap-2"
              >
                <UserPlus className="size-4" />
                Edit Group & Members ({10 - allMembers.length} slots available)
              </button>
            </div>
          )}

          {/* Members List */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingGroup ? (
              <div className="text-center text-base-content/70 py-8">
                <span className="loading loading-spinner loading-lg"></span>
                <p className="mt-2">Loading members...</p>
              </div>
            ) : allMembers.length === 0 ? (
              <div className="text-center text-base-content/70 py-8">
                <Users className="size-12 mx-auto mb-2 opacity-50" />
                <p>No members yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allMembers.map((member) => {
                  // Handle both populated objects and ObjectIds
                  const memberId = member?._id || member;
                  const memberIdStr = memberId?.toString() || memberId;
                  const currentUserIdStr = authUser?.data?._id?.toString();

                  const isMemberAdmin = memberIdStr === adminIdStr;
                  const isCurrentUser = memberIdStr === currentUserIdStr;
                  const canRemove = isAdmin && !isMemberAdmin && !isCurrentUser;

                  // Get member info (handles both populated and non-populated)
                  const memberInfo =
                    typeof member === "object" && member?.fullname
                      ? member
                      : {
                          _id: memberId,
                          fullname: "Loading...",
                          email: "",
                          profilePic: "/avatar.png",
                        };

                  return (
                    <div
                      key={memberId}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-base-200 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative flex-shrink-0">
                          <img
                            src={memberInfo.profilePic || "/avatar.png"}
                            alt={memberInfo.fullname}
                            className="size-10 rounded-full object-cover ring-2 ring-offset-2 ring-offset-base-100"
                          />
                          {/* Online status indicator */}
                          {Array.isArray(onlineUsers) &&
                            onlineUsers.includes(memberIdStr) && (
                              <div className="absolute bottom-0 right-0 size-3.5 bg-green-500 rounded-full ring-2 ring-base-100 border border-base-100"></div>
                            )}
                          {/* Admin crown indicator */}
                          {isMemberAdmin && (
                            <div className="absolute -top-1 -right-1 size-4 bg-yellow-500 rounded-full flex items-center justify-center ring-2 ring-base-100">
                              <Crown className="size-2.5 text-yellow-900" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">
                              {memberInfo.fullname}
                            </span>
                            {isMemberAdmin && (
                              <span className="badge badge-xs badge-warning flex-shrink-0">
                                Admin
                              </span>
                            )}
                            {isCurrentUser && (
                              <span className="badge badge-xs badge-info flex-shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-base-content/70 truncate">
                              {memberInfo.email || "Member"}
                            </p>
                            {Array.isArray(onlineUsers) &&
                              onlineUsers.includes(memberIdStr) && (
                                <span className="badge badge-xs badge-success flex-shrink-0">
                                  Online
                                </span>
                              )}
                          </div>
                        </div>
                      </div>

                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(memberId)}
                          disabled={isRemoving[memberId]}
                          className="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/20"
                          title="Remove member"
                        >
                          {isRemoving[memberId] ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            <UserMinus className="size-4" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-base-300">
            <button onClick={onClose} className="btn btn-ghost w-full">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Edit Group Modal */}
      {isEditModalOpen && (
        <EditGroupModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          group={group}
          onGroupUpdated={handleGroupUpdated}
        />
      )}
    </>
  );
};

export default GroupMembersModal;
