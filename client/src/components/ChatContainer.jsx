import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../../context/ChatContext.jsx";
import { AuthContext } from "../../context/AuthContext.jsx";
import toast from "react-hot-toast";

const ChatContainer = () => {
  const { selectedUser, setSelectedUser, messages, getMessages, sendMessage } =
    useContext(ChatContext);
  const { authUser, onlineUsers, logout } = useContext(AuthContext);
  const scrollEnd = useRef();
  const [messageText, setMessageText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  // Load messages when user is selected
  useEffect(() => {
    if (selectedUser?._id && getMessages) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser, getMessages]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollEnd.current && messages) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Send message handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && !selectedImage) return;

    const messageData = { text: messageText.trim() };

    if (selectedImage) {
      const reader = new FileReader();
      reader.readAsDataURL(selectedImage);
      reader.onload = async () => {
        messageData.image = reader.result;
        const result = await sendMessage(messageData);
        if (result?.success) {
          setMessageText("");
          setSelectedImage(null);
        }
      };
      reader.onerror = () => {
        toast.error("Failed to process image");
      };
    } else {
      const result = await sendMessage(messageData);
      if (result?.success) setMessageText("");
    }
  };

  // Handle full name click to show right sidebar only on mobile
  const handleFullNameClick = () => {
    if (window.innerWidth < 768) {
      setShowRightSidebar(true);
    }
  };

  // Handle back from right sidebar
  const handleBackFromSidebar = () => {
    setShowRightSidebar(false);
  };

  // Handle logout from mobile sidebar
  const handleLogout = () => {
    if (logout) {
      logout();
    }
  };

  if (!selectedUser) {
    return (
      <div className="flex flex-col justify-center items-center gap-2 text-gray-500 bg-white/10 max-md:hidden h-full">
        <img src={assets.Quick_Chat_Icon_New1} alt="" className="max-w-45" />
        <p className="text-lg font-medium text-white">Chat anytime, anywhere</p>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Main Chat Area */}
      <div
        className={`h-full flex flex-col transition-all duration-300 ${
          showRightSidebar ? "md:w-1/2 max-md:hidden" : "w-full"
        }`}
      >
        {/* Header - Fixed */}
        <div className="flex items-center gap-3 py-3 px-4 my-0 border-b border-stone-500 bg-black/20">
          <img
            src={selectedUser.profilePic || assets.avatar_icon}
            alt=""
            className="w-8 rounded-full"
          />
          <p
            className="flex-1 text-lg text-white flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleFullNameClick}
          >
            {selectedUser.fullName}
            {onlineUsers.includes(selectedUser._id) && (
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
            )}
          </p>
          <img
            onClick={() => setSelectedUser(null)}
            src={assets.arrow_icon}
            alt=""
            className="md:hidden max-w-7 cursor-pointer"
          />
        </div>

        {/* Messages Area - Scrollable */}
        <div
          className="flex-1 overflow-y-auto bg-transparent"
          style={{ height: "calc(100vh - 140px)" }}
        >
          <div className="p-4">
            {messages && messages.length > 0 ? (
              <>
                {messages.map((msg, index) => {
                  const isOwn = msg.senderId === authUser?._id;
                  return (
                    <div
                      key={msg._id || index}
                      className={`flex items-end gap-2 mb-4 ${
                        isOwn ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isOwn && (
                        <div className="flex flex-col items-center text-xs">
                          <img
                            src={selectedUser.profilePic || assets.avatar_icon}
                            alt=""
                            className="w-7 rounded-full"
                          />
                          <p className="text-gray-500">
                            {formatMessageTime(msg.createdAt)}
                          </p>
                        </div>
                      )}

                      {msg.image ? (
                        <img
                          src={msg.image}
                          alt=""
                          className="max-w-[230px] border border-gray-700 rounded-lg"
                        />
                      ) : (
                        <p
                          className={`p-2 max-w-[200px] md:text-sm font-light rounded-lg break-words ${
                            isOwn
                              ? "bg-violet-500/30 text-white rounded-br-none"
                              : "bg-gray-700/30 text-white rounded-bl-none"
                          }`}
                        >
                          {msg.text}
                        </p>
                      )}

                      {isOwn && (
                        <div className="flex flex-col items-center text-xs">
                          <img
                            src={authUser.profilePic || assets.avatar_icon}
                            alt=""
                            className="w-7 rounded-full"
                          />
                          <p className="text-gray-500">
                            {formatMessageTime(msg.createdAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={scrollEnd}></div>
              </>
            ) : (
              <div className="flex justify-center items-center h-full min-h-[400px]">
                <p className="text-gray-500">
                  No messages yet. Start the conversation!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Image Preview */}
        {selectedImage && (
          <div className="mx-4 mb-2 bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">
                Image selected: {selectedImage.name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="text-red-400 hover:text-red-300 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Input Area - Fixed */}
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-3 p-4 border-t border-stone-500/30 bg-black/20"
        >
          <div className="flex-1 flex items-center bg-gray-100/12 px-3 rounded-full">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Send a message"
              className="flex-1 text-sm p-3 border-none rounded-lg outline-none bg-transparent text-white placeholder-gray-400"
            />
            <input
              type="file"
              id="image"
              accept="image/png, image/jpeg"
              hidden
              onChange={(e) => setSelectedImage(e.target.files[0])}
            />
            <label htmlFor="image">
              <img
                src={assets.gallery_icon}
                alt=""
                className="w-5 mr-2 cursor-pointer"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={!messageText.trim() && !selectedImage}
          >
            <img
              src={assets.send_button}
              alt=""
              className={`w-7 cursor-pointer ${
                !messageText.trim() && !selectedImage
                  ? "opacity-50"
                  : "opacity-100"
              }`}
            />
          </button>
        </form>
      </div>

      {/* Mobile Right Sidebar */}
      {showRightSidebar && (
        <div className="md:w-1/2 max-md:w-full max-md:absolute max-md:inset-0 max-md:z-10 bg-[#8185B2]/10 text-white h-full flex flex-col">
          <div className="pt-4 flex flex-col items-center gap-2 text-xs font-light mx-auto">
            {/* Back Button */}
            <div className="w-full flex justify-start px-4 mb-4">
              <img
                onClick={handleBackFromSidebar}
                src={assets.arrow_icon}
                alt="Back"
                className="max-w-7 cursor-pointer transform rotate-180"
              />
            </div>

            <img
              src={selectedUser?.profilePic || assets.avatar_icon}
              alt=""
              className="w-20 aspect-[1/1] rounded-full"
            />
            <h1 className="px-10 text-xl font-medium mx-auto flex items-center gap-2">
              {onlineUsers.includes(selectedUser._id) && (
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
              )}
              {selectedUser.fullName}
            </h1>
            <p className="px-10 mx-auto">{selectedUser.bio}</p>
          </div>

          <hr className="border-t border-[#ffffff50] my-4" />

          <div className="flex-1 overflow-y-auto px-5 text-xs">
            <p>Media</p>
            <div className="mt-2 grid grid-cols-2 gap-4 opacity-80">
              {messages
                ?.filter((msg) => msg.image)
                .map((msg, index) => (
                  <div
                    key={index}
                    onClick={() => window.open(msg.image)}
                    className="cursor-pointer rounded"
                  >
                    <img
                      src={msg.image}
                      alt=""
                      className="w-full h-28 object-cover rounded-md"
                    />
                  </div>
                ))}
            </div>
          </div>

          <div className="flex justify-center bg-[#8185B2]/20 py-3">
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-purple-400 to-violet-600 text-white 
                         text-sm font-light py-2 px-20 rounded-full
                         cursor-pointer hover:opacity-90 transition-opacity"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
