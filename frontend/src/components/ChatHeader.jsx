import { X, Users } from "lucide-react";
import { useState } from "react";
import { useChatstore } from "../store/useChatstore";
import { useAuthStore } from "../store/useAuthStore";
import GroupMembersModal from "./GroupMembersModal";

const ChatHeader = () => {
  const { selectedUser, selectedChatType, setSelectedUser, groups, getGroups } =
    useChatstore();
  const { onlineUsers, authUser } = useAuthStore();
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const isGroupChat = selectedChatType === "group";

  // Get full group data if it's a group chat
  const groupData = isGroupChat
    ? groups.find((g) => g._id === selectedUser?._id) || selectedUser
    : null;

  const isAdmin =
    isGroupChat &&
    groupData &&
    (groupData?.adminId?._id === authUser?.data?._id ||
      groupData?.adminId?.toString() === authUser?.data?._id);

  if (!selectedUser) return null;

  // Calculate member count properly
  const memberCount =
    isGroupChat && groupData
      ? (() => {
          const adminIdStr =
            groupData?.adminId?._id?.toString() ||
            groupData?.adminId?.toString();
          // Count unique members (excluding admin from members array since admin is separate)
          const uniqueMembers = (groupData?.members || []).filter((m) => {
            const memberIdStr = m?._id?.toString() || m?.toString();
            return memberIdStr !== adminIdStr;
          });
          // Admin + unique members = total count
          return uniqueMembers.length + (groupData?.adminId ? 1 : 0);
        })()
      : 0;

  return (
    <>
      <div className="p-2.5 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className="avatar flex-shrink-0">
              <div className="size-10 rounded-full relative">
                <img
                  src={
                    isGroupChat
                      ? groupData?.profilePic ||
                        "https://ui-avatars.com/api/?name=" +
                          encodeURIComponent(selectedUser.name || "Group") +
                          "&background=6366f1&color=fff&size=200&bold=true"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt={isGroupChat ? selectedUser.name : selectedUser.fullname}
                />
                {isGroupChat && (
                  <div className="absolute -bottom-1 -right-1 size-4 bg-primary rounded-full flex items-center justify-center">
                    <Users className="size-2.5 text-primary-content" />
                  </div>
                )}
              </div>
            </div>

            {/* Chat info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">
                {isGroupChat ? selectedUser.name : selectedUser.fullname}
              </h3>
              <div className="flex items-center gap-2">
                {isGroupChat ? (
                  <button
                    onClick={() => setIsMembersModalOpen(true)}
                    className="text-sm text-base-content/70 hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <Users className="size-3" />
                    <span>
                      {memberCount} member{memberCount !== 1 ? "s" : ""}
                    </span>
                  </button>
                ) : (
                  <p className="text-sm text-base-content/70">
                    {onlineUsers.includes(selectedUser._id)
                      ? "Online"
                      : "Offline"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {isGroupChat && (
              <button
                onClick={() => setIsMembersModalOpen(true)}
                className="btn btn-ghost btn-sm btn-circle"
                title="View group members"
              >
                <Users className="size-4" />
              </button>
            )}
            <button
              onClick={() => setSelectedUser(null)}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Group Members Modal */}
      {isGroupChat && (
        <GroupMembersModal
          isOpen={isMembersModalOpen}
          onClose={() => {
            setIsMembersModalOpen(false);
            getGroups(); // Refresh groups
          }}
          group={groupData}
        />
      )}
    </>
  );
};
export default ChatHeader;
