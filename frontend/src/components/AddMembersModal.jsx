import { useState, useEffect, useRef } from "react";
import { X, Users, Plus, Check, Search } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatstore } from "../store/useChatstore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const AddMembersModal = ({ isOpen, onClose, group, onMembersAdded }) => {
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const { users } = useChatstore();
  const { authUser } = useAuthStore();

  // Get current group members IDs
  const groupMemberIds = new Set(
    [
      group?.adminId?._id || group?.adminId,
      ...(group?.members || []).map((m) => m?._id || m?.toString() || m),
    ].map((id) => id?.toString())
  );

  // Filter out current user, already selected members, and existing group members
  const availableUsers = users.filter(
    (user) =>
      user._id !== authUser?.data?._id &&
      !groupMemberIds.has(user._id?.toString()) &&
      !selectedMembers.find((m) => m._id === user._id) &&
      user.fullname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const maxCanAdd = 10 - (groupMemberIds.size || 0);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isDropdownOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMembers([]);
      setSearchQuery("");
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  const toggleMemberSelection = (user) => {
    if (selectedMembers.length >= maxCanAdd) {
      toast.error(`Maximum ${maxCanAdd} members can be added`);
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

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    setIsAdding(true);
    try {
      const memberIds = selectedMembers.map((m) => m._id);
      const response = await axiosInstance.post(`/group/${group._id}/members`, {
        memberIds,
      });

      if (response.data.error) {
        toast.error(response.data.message);
        setIsAdding(false);
      } else {
        toast.success(
          `${selectedMembers.length} member(s) added successfully!`
        );
        setIsAdding(false);
        // Small delay to let the toast show before closing
        setTimeout(() => {
          onMembersAdded();
        }, 300);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add members");
      console.error("Error adding members:", error);
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center gap-2">
            <UserPlus className="size-5" />
            <h2 className="text-lg font-semibold">Add Members</h2>
            <span className="badge badge-sm badge-primary">
              {selectedMembers.length}/{maxCanAdd}
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            disabled={isAdding}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div>
              <label className="label">
                <span className="label-text font-medium">
                  Selected Members ({selectedMembers.length}/{maxCanAdd})
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <div
                    key={member._id}
                    className="badge badge-lg gap-2 p-3 bg-primary text-primary-content"
                  >
                    <img
                      src={member.profilePic || "/avatar.png"}
                      alt={member.fullname}
                      className="size-5 rounded-full object-cover"
                    />
                    <span className="max-w-[120px] truncate">
                      {member.fullname}
                    </span>
                    <button
                      onClick={() => removeMember(member._id)}
                      className="hover:text-error transition-colors"
                      disabled={isAdding}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Members Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="label">
              <span className="label-text font-medium">
                Select Members to Add
              </span>
              {maxCanAdd === 0 && (
                <span className="label-text-alt text-error">Group is full</span>
              )}
            </label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={isAdding || maxCanAdd === 0}
              className="btn btn-outline w-full justify-start gap-2"
            >
              <Search className="size-4" />
              <span className="flex-1 text-left">
                {maxCanAdd === 0
                  ? "Group is full (10/10 members)"
                  : selectedMembers.length >= maxCanAdd
                  ? "Maximum members reached"
                  : "Search and select members..."}
              </span>
            </button>

            {isDropdownOpen && maxCanAdd > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-80 overflow-hidden flex flex-col">
                {/* Search Input */}
                <div className="p-3 border-b border-base-300 bg-base-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-base-content/50" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input input-sm input-bordered w-full pl-10"
                    />
                  </div>
                </div>

                {/* Users List */}
                <div className="overflow-y-auto max-h-64">
                  {availableUsers.length === 0 ? (
                    <div className="p-4 text-center text-base-content/70">
                      <Users className="size-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {searchQuery
                          ? "No users found matching your search"
                          : "No available users to add"}
                      </p>
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
                                isAdding ||
                                (!isSelected &&
                                  selectedMembers.length >= maxCanAdd)
                              }
                              className={`w-full p-3 hover:bg-base-200 flex items-center gap-3 transition-colors ${
                                isSelected ? "bg-primary/10" : ""
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <img
                                src={user.profilePic || "/avatar.png"}
                                alt={user.fullname}
                                className="size-10 rounded-full object-cover ring-2 ring-offset-2 ring-offset-base-100"
                              />
                              <div className="flex-1 text-left min-w-0">
                                <div className="font-medium truncate">
                                  {user.fullname}
                                </div>
                                <div className="text-sm text-base-content/70 truncate">
                                  {user.email}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="flex-shrink-0">
                                  <Check className="size-5 text-primary" />
                                </div>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Footer info */}
                {availableUsers.length > 0 && (
                  <div className="p-2 border-t border-base-300 bg-base-200 text-xs text-base-content/70 text-center">
                    {selectedMembers.length > 0
                      ? `${selectedMembers.length} selected • ${
                          maxCanAdd - selectedMembers.length
                        } more available`
                      : `Select up to ${maxCanAdd} members`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-base-300">
          <button
            onClick={onClose}
            className="btn btn-ghost"
            disabled={isAdding}
          >
            Cancel
          </button>
          <button
            onClick={handleAddMembers}
            className="btn btn-primary"
            disabled={
              isAdding || selectedMembers.length === 0 || maxCanAdd === 0
            }
          >
            {isAdding ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Adding...
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Add{" "}
                {selectedMembers.length > 0 ? `${selectedMembers.length} ` : ""}
                Member{selectedMembers.length !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMembersModal;
