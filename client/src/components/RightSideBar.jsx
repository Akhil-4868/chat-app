import React, { useContext, useEffect, useState } from "react";
import assets from "../assets/assets";
import { AuthContext } from "../../context/AuthContext.jsx";
import { ChatContext } from "../../context/ChatContext.jsx";

const RightSideBar = () => {
  const { logout, onlineUsers } = useContext(AuthContext);
  const { selectedUser, messages } = useContext(ChatContext);
  const [msgImages, setMsgImages] = useState([]);

  // Extract images from messages
  useEffect(() => {
    if (messages?.length) {
      setMsgImages(messages.filter((msg) => msg.image).map((msg) => msg.image));
    } else {
      setMsgImages([]);
    }
  }, [messages]);

  // Handle logout
  const handleLogout = () => {
    if (logout) {
      logout();
    }
  };

  if (!selectedUser) {
    return null;
  }

  return (
    <div className="bg-[#8185B2]/10 text-white w-full h-full flex flex-col max-md:hidden">
      {/* User Info Section - Fixed */}
      <div className="pt-16 flex flex-col items-center gap-2 text-xs font-light mx-auto bg-black/10">
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
        <p className="px-10 mx-auto text-center">{selectedUser.bio}</p>
        <div className="pb-4"></div>
      </div>

      <hr className="border-t border-[#ffffff50] mx-4" />

      {/* Media Section - Scrollable */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ height: "calc(100vh - 300px)" }}
      >
        <div className="px-5 py-4 text-xs">
          <p className="mb-4 font-medium">Media</p>
          {msgImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 opacity-80">
              {msgImages.map((url, index) => (
                <div
                  key={index}
                  onClick={() => window.open(url)}
                  className="cursor-pointer rounded hover:opacity-100 transition-opacity"
                >
                  <img
                    src={url}
                    alt=""
                    className="w-full h-28 object-cover rounded-md"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">
              No media shared yet
            </p>
          )}
        </div>
      </div>

      {/* Logout Button - Fixed */}
      <div className="flex justify-center bg-[#8185B2]/20 py-4">
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
  );
};

export default RightSideBar;
