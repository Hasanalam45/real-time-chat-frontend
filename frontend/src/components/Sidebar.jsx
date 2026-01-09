import { useEffect, useState } from "react";
import { Users, UserPlus, MessageSquare } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatstore } from "../store/useChatstore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import CreateGroupModal from "./CreateGroupModal";

const Sidebar = () => {
  const {
    getUsers,
    users,
    groups,
    getGroups,
    selectedUser,
    selectedChatType,
    setSelectedUser,
    isUsersLoading,
    isGroupsLoading,
  } = useChatstore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("contacts"); // 'contacts' or 'groups'
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const onlineUsers = useAuthStore((state) => state.onlineUsers);

  useEffect(() => {
    console.log("✅ Online Users Updated:", onlineUsers);
  }, [onlineUsers]);

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers?.includes(user._id))
    : users;

  if (isUsersLoading && isGroupsLoading) return <SidebarSkeleton />;

  const handleSelectChat = (chat, type) => {
    setSelectedUser(chat, type);
  };

  const isChatSelected = (chatId, type) => {
    return selectedUser?._id === chatId && selectedChatType === type;
  };

  return (
    <>
      <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
        {/* Header with Tabs */}
        <div className="border-b border-base-300 w-full p-3">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="size-6" />
            <span className="font-medium hidden lg:block">Chats</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setActiveTab("contacts")}
              className={`flex-1 btn btn-sm ${
                activeTab === "contacts" ? "btn-primary" : "btn-ghost"
              }`}
            >
              <Users className="size-4" />
              <span className="hidden lg:inline ml-1">Contacts</span>
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className={`flex-1 btn btn-sm ${
                activeTab === "groups" ? "btn-primary" : "btn-ghost"
              }`}
            >
              <MessageSquare className="size-4" />
              <span className="hidden lg:inline ml-1">Groups</span>
            </button>
          </div>

          {/* Contacts tab controls */}
          {activeTab === "contacts" && (
            <div className="hidden lg:flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showOnlineOnly}
                  onChange={(e) => setShowOnlineOnly(e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                <span className="text-sm">Show online only</span>
              </label>
              <span className="text-xs text-zinc-500">
                ({Math.max(onlineUsers.length - 1, 0)} online)
              </span>
            </div>
          )}

          {/* Groups tab - Create button */}
          {activeTab === "groups" && (
            <button
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="hidden lg:flex w-full btn btn-sm btn-primary gap-2"
            >
              <UserPlus className="size-4" />
              <span>Create Group</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto w-full py-3 flex-1">
          {activeTab === "contacts" && (
            <>
              {/* Mobile Create Group Button */}
              <button
                onClick={() => setIsCreateGroupModalOpen(true)}
                className="lg:hidden w-full p-3 flex items-center justify-center gap-2 hover:bg-base-300 transition-colors mb-2"
              >
                <UserPlus className="size-5" />
              </button>

              {filteredUsers.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleSelectChat(user, "direct")}
                  className={`
                    w-full p-3 flex items-center gap-3
                    hover:bg-base-300 transition-colors
                    ${
                      isChatSelected(user._id, "direct")
                        ? "bg-base-300 ring-1 ring-base-300"
                        : ""
                    }
                  `}
                >
                  <div className="relative mx-auto lg:mx-0">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullname}
                      className="size-12 object-cover rounded-full"
                    />
                    {Array.isArray(onlineUsers) &&
                      onlineUsers.includes(user._id) && (
                        <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                      )}
                  </div>

                  <div className="hidden lg:block text-left min-w-0">
                    <div className="font-medium truncate">{user.fullname}</div>
                    <div className="text-sm text-zinc-400">
                      {Array.isArray(onlineUsers) &&
                      onlineUsers.includes(user._id)
                        ? "Online"
                        : "Offline"}
                    </div>
                  </div>
                </button>
              ))}

              {filteredUsers.length === 0 && (
                <div className="text-center text-zinc-500 py-4">
                  No users available
                </div>
              )}
            </>
          )}

          {activeTab === "groups" && (
            <>
              {/* Mobile Create Group Button */}
              <button
                onClick={() => setIsCreateGroupModalOpen(true)}
                className="lg:hidden w-full p-3 flex items-center justify-center gap-2 hover:bg-base-300 transition-colors mb-2"
              >
                <UserPlus className="size-5" />
                <span className="lg:hidden">Create Group</span>
              </button>

              {isGroupsLoading ? (
                <div className="text-center text-zinc-500 py-4">
                  Loading groups...
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center text-zinc-500 py-4 px-2">
                  No groups yet. Create one to get started!
                </div>
              ) : (
                groups.map((group) => {
                  // Calculate member count properly - exclude admin from members array
                  const adminIdStr =
                    group.adminId?._id?.toString() || group.adminId?.toString();
                  const uniqueMembers = (group.members || []).filter((m) => {
                    const memberIdStr = m?._id?.toString() || m?.toString();
                    return memberIdStr !== adminIdStr;
                  });
                  // Admin + unique members = total count
                  const memberCount =
                    uniqueMembers.length + (group.adminId ? 1 : 0);

                  const defaultGroupPic =
                    group.profilePic ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      group.name || "Group"
                    )}&background=6366f1&color=fff&size=200&bold=true`;

                  return (
                    <button
                      key={group._id}
                      onClick={() => handleSelectChat(group, "group")}
                      className={`
                        w-full p-3 flex items-center gap-3
                        hover:bg-base-300 transition-colors
                        ${
                          isChatSelected(group._id, "group")
                            ? "bg-base-300 ring-1 ring-base-300"
                            : ""
                        }
                      `}
                    >
                      <div className="relative mx-auto lg:mx-0">
                        <img
                          src={defaultGroupPic}
                          alt={group.name}
                          className="size-12 object-cover rounded-full"
                        />
                        <div className="absolute bottom-0 right-0 size-4 bg-primary rounded-full ring-2 ring-base-100 flex items-center justify-center">
                          <span className="text-[8px] text-primary-content font-bold">
                            {memberCount}
                          </span>
                        </div>
                      </div>

                      <div className="hidden lg:block text-left min-w-0 flex-1">
                        <div className="font-medium truncate">{group.name}</div>
                        <div className="text-sm text-zinc-400 truncate">
                          {memberCount} member{memberCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </>
          )}
        </div>
      </aside>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
      />
    </>
  );
};

export default Sidebar;
