import React, { useContext, useState } from "react";
import assets from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext.jsx";
import { ChatContext } from "../../context/ChatContext.jsx";

const Sidebar = () => {
  const {
    users = [],
    selectedUser,
    setSelectedUser,
    unseenMessages = {},
  } = useContext(ChatContext) || {};

  const { logout, onlineUsers = [] } = useContext(AuthContext) || {};

  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();

  const filteredUsers = input
    ? users.filter((user) =>
        user?.fullName?.toLowerCase().includes(input.toLowerCase())
      )
    : users;

  if (!users || !onlineUsers) {
    return (
      <div className="h-full flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div
      className={`bg-[#8185B2]/10 h-full rounded-none sm:rounded-xl text-white flex flex-col
    ${selectedUser ? "max-md:hidden" : ""}`}
    >
      {/* Header Section - Fixed */}
      <div className="p-5 bg-black/10">
        <div className="flex items-center justify-between relative">
          <img src={assets.Quick_Chat_logo2} alt="logo" className="max-w-40" />

          {/* Menu Button */}
          <div className="relative py-2">
            <img
              src={assets.menu_icon}
              alt="menu"
              className="max-h-5 cursor-pointer"
              onClick={() => setMenuOpen((prev) => !prev)}
            />
            {menuOpen && (
              <div
                className="absolute top-full right-0 z-20 w-32 p-5 rounded-md 
               bg-[#282142] border border-gray-600 text-gray-100"
              >
                <p
                  onClick={() => {
                    navigate("/profile");
                    setMenuOpen(false);
                  }}
                  className="cursor-pointer text-sm hover:text-violet-400 transition"
                >
                  Edit Profile
                </p>
                <hr className="my-2 border-t border-gray-500" />
                <p
                  onClick={() => {
                    logout && logout();
                    setMenuOpen(false);
                  }}
                  className="cursor-pointer text-sm hover:text-red-400 transition"
                >
                  Logout
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-[#282142] flex items-center gap-2 rounded-full py-3 px-4 mt-5">
          <img src={assets.search_icon} alt="Search" className="w-3" />
          <input
            onChange={(e) => setInput(e.target.value)}
            type="text"
            value={input}
            placeholder="Search User..."
            className="bg-transparent border-none outline-none
          text-white text-xs placeholder-[#c8c8c8] flex-1"
          />
        </div>
      </div>

      {/* User List - Scrollable */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ height: "calc(100vh - 200px)" }}
      >
        <div className="px-5 pb-5">
          {filteredUsers.map((user, index) => (
            <div
              onClick={() => setSelectedUser && setSelectedUser(user)}
              key={user?._id || index}
              className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm hover:bg-[#282142]/30 transition-colors ${
                selectedUser?._id === user?._id && "bg-[#282142]/50"
              }`}
            >
              <img
                src={user?.profilePic || assets.avatar_icon}
                alt=""
                className="w-[35px] aspect-[1/1] rounded-full"
              />
              <div className="flex flex-col leading-5">
                <p>{user?.fullName || "Unknown User"}</p>
                {onlineUsers.includes(user?._id) ? (
                  <span className="text-green-400 text-xs">Online</span>
                ) : (
                  <span className="text-neutral-400 text-xs">Offline</span>
                )}
              </div>
              {unseenMessages[user?._id] > 0 && (
                <p className="absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-violet-500/50">
                  {unseenMessages[user._id]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
