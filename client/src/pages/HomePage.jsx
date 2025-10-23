import React, { useContext } from "react";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import RightSideBar from "../components/RightSideBar";
import { ChatContext } from "../../context/ChatContext.jsx";

const HomePage = () => {
  const { selectedUser } = useContext(ChatContext);

  return (
    <div className="w-full h-screen p-0 sm:px-[15%] sm:py-[5%]">
      <div
        className={`backdrop-blur-xl border-2 border-gray-600 rounded-none sm:rounded-2xl 
    overflow-hidden h-full grid relative 
    ${
      selectedUser
        ? "grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr] xl:grid-cols-[1fr_2fr_1fr]"
        : "grid-cols-1 md:grid-cols-[2fr_3fr]"
    }`}
        style={{ maxHeight: "100vh" }}
      >
        <div className="min-h-0">
          <Sidebar />
        </div>
        <div className="min-h-0">
          <ChatContainer />
        </div>
        {selectedUser && (
          <div className="min-h-0">
            <RightSideBar />
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
