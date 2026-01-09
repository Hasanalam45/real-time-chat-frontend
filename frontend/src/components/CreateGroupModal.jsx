import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Users, Plus, Check, Search } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatstore } from "../store/useChatstore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const CreateGroupModal = ({ isOpen, onClose }) => {
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const dropdownRef = useRef(null);
  const dropdownButtonRef = useRef(null);
  const searchInputRef = useRef(null);

  const { users } = useChatstore();
  const { authUser } = useAuthStore();
  const { getGroups } = useChatstore();

  // Filter out current user and already selected members
  const availableUsers = users.filter(
    (user) =>
      user._id !== authUser?.data?._id &&
      !selectedMembers.find((m) => m._id === user._id) &&
      user.fullname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (isDropdownOpen && dropdownButtonRef.current) {
      const buttonRect = dropdownButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: buttonRect.bottom + 8,
        left: buttonRect.left,
        width: buttonRect.width,
      });
    }
  }, [isDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setGroupName("");
      setSelectedMembers([]);
      setSearchQuery("");
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  const toggleMemberSelection = (user) => {
    if (selectedMembers.length >= 9) {
      toast.error("Maximum 9 members allowed (10 total including you)");
      return;
    }

    if (selectedMembers.find((m) => m._id === user._id)) {
      setSelectedMembers(selectedMembers.filter((m) => m._id !== user._id));
    } else {
      setSelectedMembers([...selectedMembers, user]);
    }
    setSearchQuery("");
  };

  const removeMember = (userId) => {
    setSelectedMembers(selectedMembers.filter((m) => m._id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    setIsCreating(true);
    try {
      const memberIds = selectedMembers.map((m) => m._id);
      const response = await axiosInstance.post("/group/create", {
        name: groupName.trim(),
        members: memberIds,
      });

      if (response.data.error) {
        toast.error(response.data.message);
      } else {
        toast.success("Group created successfully!");
        getGroups(); // Refresh groups list
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      console.error("Error creating group:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-xl shadow-2xl w-full max-w-2xl mx-auto max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-base-200/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Create New Group</h2>
              <p className="text-xs text-base-content/60 mt-0.5">
                Add up to 9 members to your group
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle hover:bg-base-300"
            disabled={isCreating}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="p-6 space-y-6">
            {/* Group Name Input */}
            <div className="space-y-2">
              <label className="label py-0">
                <span className="label-text font-semibold text-base">
                  Group Name
                </span>
                <span className="label-text-alt text-error font-medium">
                  Required
                </span>
              </label>
              <input
                type="text"
                placeholder="Enter a group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={50}
                className="input input-bordered w-full input-lg focus:input-primary"
                disabled={isCreating}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-base-content/50">
                  Choose a name that represents your group
                </span>
                <span className="text-xs text-base-content/50">
                  {groupName.length}/50
                </span>
              </div>
            </div>

            {/* Selected Members Section */}
            {selectedMembers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="label-text font-semibold text-base">
                    Selected Members
                  </label>
                  <span className="badge badge-primary badge-sm">
                    {selectedMembers.length}/9
                  </span>
                </div>
                <div className="bg-base-200/50 rounded-lg p-3 border border-base-300">
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <div
                        key={member._id}
                        className="badge badge-lg gap-2 px-3 py-2 bg-primary/20 text-primary-content border border-primary/30 hover:bg-primary/30 transition-colors"
                      >
                        <img
                          src={member.profilePic || "/avatar.png"}
                          alt={member.fullname}
                          className="size-5 rounded-full object-cover"
                        />
                        <span className="font-medium">{member.fullname}</span>
                        <button
                          onClick={() => removeMember(member._id)}
                          className="hover:text-error transition-colors ml-1"
                          disabled={isCreating}
                          title="Remove member"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Add Members Dropdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="label-text font-semibold text-base">
                  Add Members
                </label>
                {selectedMembers.length >= 9 && (
                  <span className="badge badge-error badge-sm">
                    Max reached
                  </span>
                )}
              </div>

              <div className="relative">
                <button
                  ref={dropdownButtonRef}
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={isCreating || selectedMembers.length >= 9}
                  className={`btn w-full justify-start gap-3 h-auto py-3 ${
                    selectedMembers.length >= 9
                      ? "btn-disabled"
                      : "btn-outline hover:btn-primary"
                  }`}
                >
                  <div className="p-1.5 bg-base-200 rounded-lg">
                    <Search className="size-4" />
                  </div>
                  <span className="flex-1 text-left">
                    {selectedMembers.length >= 9 ? (
                      <span className="text-base-content/50">
                        Maximum members reached
                      </span>
                    ) : (
                      <span>
                        {selectedMembers.length === 0
                          ? "Search and select members..."
                          : `Add more members (${selectedMembers.length}/9 selected)`}
                      </span>
                    )}
                  </span>
                  <div className="badge badge-sm badge-ghost">
                    {selectedMembers.length}/9
                  </div>
                </button>

                {isDropdownOpen &&
                  createPortal(
                    <div
                      ref={dropdownRef}
                      className="fixed z-[100] bg-base-100 border-2 border-primary/20 rounded-xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-sm"
                      style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`,
                        maxHeight: "min(320px, calc(95vh - 150px))",
                      }}
                    >
                      {/* Search Input */}
                      <div className="p-3 bg-primary/5 border-b border-primary/10 flex-shrink-0">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-primary/60" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input input-bordered input-sm w-full pl-10 focus:input-primary bg-base-100"
                          />
                        </div>
                      </div>

                      {/* Users List */}
                      <div
                        className="overflow-y-auto flex-1"
                        style={{ maxHeight: "240px" }}
                      >
                        {availableUsers.length === 0 ? (
                          <div className="p-8 text-center text-base-content/60">
                            <Users className="size-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">
                              {searchQuery
                                ? "No users found"
                                : "No available users"}
                            </p>
                            {searchQuery && (
                              <p className="text-xs text-base-content/50 mt-1">
                                Try a different search term
                              </p>
                            )}
                          </div>
                        ) : (
                          <ul className="divide-y divide-base-300">
                            {availableUsers.map((user) => {
                              const isSelected = selectedMembers.find(
                                (m) => m._id === user._id
                              );
                              return (
                                <li key={user._id}>
                                  <button
                                    type="button"
                                    onClick={() => toggleMemberSelection(user)}
                                    disabled={
                                      isCreating ||
                                      (selectedMembers.length >= 9 &&
                                        !isSelected)
                                    }
                                    className={`w-full p-3 hover:bg-primary/5 active:bg-primary/10 flex items-center gap-3 transition-all ${
                                      isSelected
                                        ? "bg-primary/15 border-l-4 border-l-primary"
                                        : "border-l-4 border-l-transparent hover:border-l-primary/30"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  >
                                    <div className="relative flex-shrink-0">
                                      <img
                                        src={user.profilePic || "/avatar.png"}
                                        alt={user.fullname}
                                        className="size-10 rounded-full object-cover ring-2 ring-primary/20 ring-offset-1 ring-offset-base-100"
                                      />
                                      {isSelected && (
                                        <div className="absolute -bottom-1 -right-1 size-5 bg-primary rounded-full flex items-center justify-center ring-2 ring-base-100">
                                          <Check className="size-3 text-primary-content" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                      <div className="font-semibold truncate">
                                        {user.fullname}
                                      </div>
                                      <div className="text-sm text-base-content/60 truncate">
                                        {user.email}
                                      </div>
                                    </div>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      {/* Footer info */}
                      {availableUsers.length > 0 && (
                        <div className="px-3 py-2 border-t border-primary/10 bg-primary/5 text-xs text-base-content/70 text-center">
                          {selectedMembers.length > 0 ? (
                            <span>
                              <span className="font-semibold">
                                {selectedMembers.length}
                              </span>{" "}
                              selected •{" "}
                              <span className="font-semibold text-primary">
                                {9 - selectedMembers.length}
                              </span>{" "}
                              more available
                            </span>
                          ) : (
                            "Select up to 9 members to add to your group"
                          )}
                        </div>
                      )}
                    </div>,
                    document.body
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-base-300 bg-base-200/50">
          <button
            onClick={onClose}
            className="btn btn-ghost"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            className="btn btn-primary gap-2"
            disabled={
              isCreating || !groupName.trim() || selectedMembers.length === 0
            }
          >
            {isCreating ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Creating...
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Create Group
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
