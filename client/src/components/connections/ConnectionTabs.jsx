import React from "react";

const ConnectionTabs = ({ dataArray, currentTab, setCurrentTab }) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
      {dataArray.map((tab) => (
        <button
          key={tab.label}
          onClick={() => setCurrentTab(tab.label)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            currentTab === tab.label
              ? "bg-indigo-600 text-white shadow"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default ConnectionTabs;