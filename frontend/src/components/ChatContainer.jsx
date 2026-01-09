import { useEffect, useRef } from "react";

import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { useChatstore } from "../store/useChatstore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    selectedChatType,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatstore();
  
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const isGroupChat = selectedChatType === 'group';


  useEffect(() => {
    if (!selectedUser) return;
    
    const chatType = selectedChatType || 'direct';
    getMessages(selectedUser._id, chatType);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, selectedChatType, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  const getSenderInfo = (message) => {
    const senderIdValue = message.senderId?._id || message.senderId;
    
    // If it's the current user's message
    if (senderIdValue === authUser.data._id) {
      return {
        name: authUser.data.fullname,
        pic: authUser.data.profilePic || "/avatar.png",
      };
    }
    
    // For group chats, use sender info from populated data
    if (isGroupChat && message.senderId?.fullname) {
      return {
        name: message.senderId.fullname,
        pic: message.senderId.profilePic || "/avatar.png",
      };
    }
    
    // For direct chats, use selected user info
    return {
      name: selectedUser?.fullname || "User",
      pic: selectedUser?.profilePic || "/avatar.png",
    };
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isMessagesLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-base-content/70">
              <p className="text-lg">No messages yet</p>
              <p className="text-sm mt-2">
                {isGroupChat ? "Start the conversation!" : "Send a message to get started"}
              </p>
            </div>
          </div>
        )}
        
        {messages.map((message) => {
          // Handle both populated and non-populated senderId
          const senderIdValue = message.senderId?._id || message.senderId;
          const isOwnMessage = senderIdValue === authUser.data._id;
          const senderInfo = getSenderInfo(message);
          
          return (
            <div
              key={message._id}
              className={`chat ${isOwnMessage ? "chat-end" : "chat-start"}`}
              ref={messageEndRef}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={senderInfo.pic}
                    alt={senderInfo.name}
                  />
                </div>
              </div>
              <div className="chat-header mb-1">
                {isGroupChat && !isOwnMessage && (
                  <span className="text-xs font-medium mr-2">{senderInfo.name}</span>
                )}
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>
              <div className="chat-bubble flex flex-col">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                  />
                )}
                {message.text && <p>{message.text}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;