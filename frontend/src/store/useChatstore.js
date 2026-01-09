import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { Socket } from "socket.io-client";
import { useAuthStore } from "./useAuthStore";


export const useChatstore = create((set,get)=>({
messages :[],  // messages state
users:[],// all the users state
groups: [], // all the groups state
selectedUser : null , // for specific chat (user or group)
selectedChatType: 'direct', // 'direct' or 'group'

isUsersLoading : false, // for loading skeletons on frontend while the number of user's load 
isGroupsLoading: false, // for loading skeletons while groups load
isMessagesLoading:  false, // for loading skeletons on frontend while the messages load 

getUsers :async()=>{
try {
    set({isUsersLoading  : true})

const res = await axiosInstance.get("/message/users")
set({users: res.data.data})


} catch (error) {
    toast.error(error.response?.data?.message)
    console.log(error);
    


}finally{


    set({isUsersLoading  :false })

}


},

getMessages :async(chatId, chatType = 'direct')=>{
    set({isMessagesLoading: true})
    
    try {
        const url = chatType === 'group' 
            ? `/message/${chatId}?type=group`
            : `/message/${chatId}?type=direct`;
        const res = await axiosInstance.get(url);
        set({messages : res.data.data || []});
    } catch (error) {
        console.log(error.response?.data?.message);
        toast.error(error.response?.data?.message || 'Failed to fetch messages');
    } finally {
        set({isMessagesLoading: false});
    }
},

subscribeToMessages : ()=>{
const {selectedUser, selectedChatType} = get()
if(!selectedUser) return
const socket = useAuthStore.getState().socket

if(!socket) return

// Join group room if it's a group chat
if (selectedChatType === 'group' && selectedUser._id) {
    socket.emit('joinGroup', selectedUser._id);
}

//optimize later
socket.on("newMessage" , (newMessage) =>{
    const currentState = get();
    
    // For direct messages, only show if receiver matches
    // For group messages, show all messages in the group
    if (currentState.selectedChatType === 'direct') {
        const receiverId = newMessage.recieverId?._id || newMessage.recieverId;
        const senderId = newMessage.senderId?._id || newMessage.senderId;
        if (receiverId === currentState.selectedUser?._id || senderId === currentState.selectedUser?._id) {
            set({
                messages : [...currentState.messages , newMessage],
            });
        }
    } else if (currentState.selectedChatType === 'group') {
        // Group message - check if it's for this group
        const groupId = newMessage.groupId?._id || newMessage.groupId;
        if (groupId === currentState.selectedUser?._id) {
            set({
                messages : [...currentState.messages , newMessage],
            });
        }
    }
});

},

unsubscribeFromMessages:()=>{
const {selectedUser, selectedChatType} = get()
const socket = useAuthStore.getState().socket

if(!socket) return

// Leave group room if it's a group chat
if (selectedChatType === 'group' && selectedUser?._id) {
    socket.emit('leaveGroup', selectedUser._id);
}

socket.off("newMessage");
},

//todo : optimize that later
setSelectedUser : (selectedUser, chatType = 'direct') => set({
    selectedUser,
    selectedChatType: chatType
}),

// Groups functions
getGroups: async () => {
    try {
        set({ isGroupsLoading: true });
        const res = await axiosInstance.get('/group');
        const groupsData = res.data.data || [];
        set({ groups: groupsData });
        
        // Update selectedUser if it's a group and we have updated data
        const currentState = get();
        if (currentState.selectedUser && currentState.selectedChatType === 'group') {
            const updatedGroup = groupsData.find(g => g._id === currentState.selectedUser._id);
            if (updatedGroup) {
                set({ selectedUser: updatedGroup });
            }
        }
    } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch groups');
        console.error(error);
    } finally {
        set({ isGroupsLoading: false });
    }
},

sendMessage: async (messageData) => {
  const { messages, selectedUser, selectedChatType } = get();
  const { socket, authUser } = useAuthStore.getState();

  if (!selectedUser) {
    toast.error('No chat selected');
    return;
  }

  try {
    const url = selectedChatType === 'group'
      ? `/message/send/${selectedUser._id}?type=group`
      : `/message/send/${selectedUser._id}?type=direct`;
    
    const res = await axiosInstance.post(url, messageData);
    const newMessage = res.data.data;

    // 1. Update local state
    set({ messages: [...messages, newMessage] });

    // Socket.IO handles broadcasting for both direct and group messages on backend
    // For direct: emits to specific receiver
    // For group: emits to group room

  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to send message');
    console.log(error?.response?.data?.message);
  }
}




}))

